import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { resolveAreaCoords } from '../utils/areaCoords';

export const getAreas = async (req: Request, res: Response) => {
  try {
    const areas = await prisma.area.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ areas });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ message: 'Failed to fetch areas' });
  }
};

export const createArea = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Area name is required' });

    const existing = await prisma.area.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ message: 'Area already exists' });

    const coords = resolveAreaCoords(name);
    const newArea = await prisma.area.create({
      data: {
        name,
        lat: coords?.[0] ?? null,
        lng: coords?.[1] ?? null,
      }
    });
    res.status(201).json({ area: newArea });
  } catch (error) {
    console.error('Error creating area:', error);
    res.status(500).json({ message: 'Failed to create area' });
  }
};

export const deleteArea = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.area.delete({ where: { id } });
    res.json({ message: 'Area deleted successfully' });
  } catch (error) {
    console.error('Error deleting area:', error);
    res.status(500).json({ message: 'Failed to delete area' });
  }
};
