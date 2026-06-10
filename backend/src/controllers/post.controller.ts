import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { broadcastDataChange } from '../utils/broadcast';

export const createPost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { content, visibility, location, hashtags, product_tag, media } = req.body;

    if (!content?.trim() && (!media || !Array.isArray(media) || media.length === 0)) {
      res.status(400).json({ message: 'Post must have text or media' });
      return;
    }

    const post = await prisma.post.create({
      data: {
        user_id: user.id,
        content: content?.trim() || null,
        visibility: visibility || 'Public',
        location: location || null,
        hashtags: hashtags || null,
        product_tag: product_tag || null,
        media: media || []
      },
      include: {
        user: { select: { id: true, name: true, profile_picture: true, role: true } }
      }
    });

    broadcastDataChange('all', 'create');
    res.status(201).json({ message: 'Post created', post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, profile_picture: true, role: true } }
      }
    });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id: Number(id) } });
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    if (post.user_id !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }
    await prisma.post.delete({ where: { id: Number(id) } });
    broadcastDataChange('all', 'delete');
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete post' });
  }
};
