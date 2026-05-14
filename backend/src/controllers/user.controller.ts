import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt.utils';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const getTechnicians = async (req: Request, res: Response) => {
  try {
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        is_active: true
      },
      select: {
        id: true,
        name: true,
        phone: true,
        team_id: true,
        location_name: true,
        lat: true,
        lng: true,
        specialization: true,
        profile_picture: true,
        team: {
          select: { name: true }
        }
      }
    });
    res.json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ message: 'Failed to fetch technicians' });
  }
};


export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phone: phone || undefined }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({ message: 'User with this email or phone already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { name, email, phone, password_hash, role }
    });

    res.json({ message: 'User created successfully', user: { id: newUser.id, name: newUser.name, role: newUser.role } });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true, team: { select: { name: true } } }
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const toggleUserActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: parseInt(id as string) } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    const updated = await prisma.user.update({
      where: { id: parseInt(id as string) },
      data: { is_active: !user.is_active }
    });
    res.json({ message: `User ${updated.is_active ? 'activated' : 'deactivated'}`, user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};


export const generateInviteLink = async (req: Request, res: Response) => {
  try {
    const { role } = req.body; 
    console.log('Backend: Generating invite for role:', role);
    
    const token = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date();
    expires_at.setFullYear(expires_at.getFullYear() + 100); 

    const invite = await prisma.inviteToken.create({
      data: { token, role: role as any, expires_at }
    });
    console.log('Backend: Invite created in DB:', invite);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl.replace(/\/$/, '')}/register?token=${token}`;
    res.json({ inviteLink, token });
  } catch (error) {
    console.error('Invite generation error:', error);
    res.status(500).json({ message: 'Failed to generate invite link' });
  }
};

export const registerViaInvite = async (req: Request, res: Response) => {
  try {
    const { token, name, email, phone, password } = req.body;

    const invite = await prisma.inviteToken.findUnique({
      where: { token }
    });

    if (!invite || invite.expires_at < new Date()) {
      res.status(400).json({ message: 'Invalid or expired invite token' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { name, email, phone, password_hash, role: invite.role }
    });

    const jwtToken = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({ 
      message: 'Registration successful', 
      user: { id: user.id, name: user.name, role: user.role },
      token: jwtToken
    });
  } catch (error: any) {
    console.error('Registration error detail:', error);
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'Email or Phone';
      res.status(400).json({ message: `${field} is already registered. Please use a unique one.` });
    } else {
      res.status(500).json({ message: 'Registration failed: ' + (error.message || 'Internal error') });
    }
  }
};

export const getInviteDetails = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await prisma.inviteToken.findUnique({ where: { token: String(token) } });
    
    if (!invite || invite.expires_at < new Date()) {
      res.status(400).json({ message: 'Invalid or expired invite token' });
      return;
    }

    res.json({ role: invite.role });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invite details' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized: User ID missing' });
      return;
    }

    const { name, location_name, lat, lng, specialization, address, profile_picture } = req.body;
    
    // Explicitly cast and sanitize inputs
    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name);
    if (location_name !== undefined) updateData.location_name = location_name ? String(location_name) : null;
    if (specialization !== undefined) updateData.specialization = specialization ? String(specialization) : null;
    if (address !== undefined) updateData.address = address ? String(address) : null;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture ? String(profile_picture) : null;
    
    // Handle coordinates safely
    if (lat !== undefined && lat !== null && lat !== '') {
      updateData.lat = Number(lat);
    } else {
      updateData.lat = null;
    }

    if (lng !== undefined && lng !== null && lng !== '') {
      updateData.lng = Number(lng);
    } else {
      updateData.lng = null;
    }

    console.log('Final Update Data:', updateData);

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData
    });

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    res.json({ 
      message: 'Profile updated successfully', 
      user: userWithoutPassword 
    });
  } catch (error: any) {
    console.error('Profile update CRITICAL error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const adminId = (req as any).user.id;

    if (userId === adminId) {
      res.status(400).json({ message: 'Security Alert: You cannot delete your own admin account.' });
      return;
    }

    // Handle dependencies before deletion
    await prisma.$transaction([
      // Unassign leads
      prisma.lead.updateMany({
        where: { assigned_to: userId },
        data: { assigned_to: null, status: 'New' } // Reset status to New if technician is deleted
      }),
      // Set creator/assigner to null if needed (if your schema allows)
      prisma.lead.updateMany({
        where: { assigned_by: userId },
        data: { assigned_by: null }
      }),
      // Delete expenses linked to this user (standard cleanup)
      prisma.expense.deleteMany({
        where: { user_id: userId }
      }),
      // Finally delete the user
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user: ' + (error.message || 'Unknown error') });
  }
};

