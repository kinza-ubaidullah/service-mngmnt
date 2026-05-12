import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt.utils.js';
import { prisma } from '../utils/prisma.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier || undefined },
          { phone: identifier || undefined }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ message: 'Your account is inactive' });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = signToken({ id: user.id, role: user.role });

    console.log('Login successful for user:', user.email);
    console.log('Role from database:', user.role);
    console.log('User object being sent:', {
      id: user.id,
      role: user.role,
      email: user.email
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
        team_id: user.team_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
        team_id: user.team_id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password' });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
};
