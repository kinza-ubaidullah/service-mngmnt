import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt.utils';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { broadcastDataChange, emitTechLocationChanged } from '../utils/broadcast';

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
        },
        assigned_jobs: {
          where: { status: { in: ['Assigned', 'InProgress', 'Reopened', 'PickedForWorkshop'] } },
          select: {
            id: true,
            lead_id: true,
            status: true,
            product_type: true,
            lat: true,
            lng: true,
            exact_address: true,
            customer: { select: { name: true, area: true, google_map_link: true } },
          },
        },
      }
    });
    res.json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ message: 'Failed to fetch technicians' });
  }
};

/** Technician GPS ping — REST fallback when WebSocket is blocked on cPanel */
export const updateLiveLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    if (!userId || role !== 'TECHNICIAN') {
      res.status(403).json({ message: 'Technicians only' });
      return;
    }

    const { lat, lng } = req.body;
    if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      res.status(400).json({ message: 'Valid lat and lng required' });
      return;
    }

    await prisma.user.update({
      where: { id: Number(userId) },
      data: { lat: Number(lat), lng: Number(lng) },
    });

    emitTechLocationChanged(Number(userId), Number(lat), Number(lng));
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating live location:', error);
    res.status(500).json({ message: 'Failed to update location' });
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
      data: { name, email, phone, password_hash, plain_password: password, role }
    });

    broadcastDataChange('users', 'create');
    res.json({ message: 'User created successfully', user: { id: newUser.id, name: newUser.name, role: newUser.role } });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true, plain_password: true, team: { select: { name: true } } }
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
    broadcastDataChange('users', 'update');
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

    if (!invite || invite.expires_at < new Date() || invite.is_used) {
      res.status(400).json({ message: 'Invalid or expired invite token' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Check if a user with this phone/email already exists — onboarding then acts as a
    // password reset for that account (works for ALL panels/roles, not just admin).
    const cleanedEmail = email ? String(email).trim() : null;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: String(phone) },
          ...(cleanedEmail ? [{ email: cleanedEmail }] : []),
        ],
      },
    });

    let user;
    let wasReset = false;

    if (existingUser) {
      // Guard: invite role must match the existing account's role (no privilege change)
      if (existingUser.role !== invite.role) {
        res.status(409).json({
          message: `This phone/email already belongs to a ${existingUser.role.replace('_', ' ')} account. Ask an admin to send an invite for the correct role, or reset the password from the Admin panel.`,
        });
        return;
      }

      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || existingUser.name,
          email: cleanedEmail ?? existingUser.email,
          password_hash,
          plain_password: password,
          is_active: true,
        },
      });
      wasReset = true;
    } else {
      user = await prisma.user.create({
        data: { name, email: cleanedEmail, phone, password_hash, plain_password: password, role: invite.role },
      });
    }

    await prisma.inviteToken.update({
      where: { token },
      data: { is_used: true },
    });

    const jwtToken = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      message: wasReset ? 'Password reset successful' : 'Registration successful',
      reset: wasReset,
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
    
    if (!invite || invite.expires_at < new Date() || invite.is_used) {
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

    const { name, email, location_name, lat, lng, specialization, address, profile_picture } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name);

    if (email !== undefined) {
      const trimmed = String(email).trim();
      if (trimmed === '') {
        updateData.email = null;
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          res.status(400).json({ message: 'Please enter a valid email address' });
          return;
        }
        const existing = await prisma.user.findFirst({
          where: { email: trimmed, id: { not: Number(userId) } },
        });
        if (existing) {
          res.status(409).json({ message: 'This email is already in use by another account' });
          return;
        }
        updateData.email = trimmed;
      }
    }

    if (location_name !== undefined) updateData.location_name = location_name ? String(location_name) : null;
    if (specialization !== undefined) updateData.specialization = specialization ? String(specialization) : null;
    if (address !== undefined) updateData.address = address ? String(address) : null;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture ? String(profile_picture) : null;

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

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData,
    });

    const { password_hash, totp_secret, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Profile update CRITICAL error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

export const lookupUser = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: q },
          { phone: q },
          { name: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        is_active: true,
        totp_enabled: true,
      },
    });

    if (!user) {
      res.json({ found: false });
      return;
    }

    res.json({ found: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Lookup failed' });
  }
};

const generateRandomPassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const buildInviteLink = (token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontendUrl.replace(/\/$/, '')}/register?token=${token}`;
};

export const getPendingInvites = async (_req: Request, res: Response) => {
  try {
    const invites = await prisma.inviteToken.findMany({
      where: { is_used: false, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    const mapped = invites.map((inv) => ({
      id: inv.id,
      role: inv.role,
      token: inv.token,
      inviteLink: buildInviteLink(inv.token),
      created_at: inv.created_at,
      expires_at: inv.expires_at,
    }));
    res.json({ invites: mapped });
  } catch (error) {
    console.error('Get pending invites error:', error);
    res.status(500).json({ message: 'Failed to fetch invites' });
  }
};

export const resendInvite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inviteId = parseInt(id as string);
    const existing = await prisma.inviteToken.findUnique({ where: { id: inviteId } });
    if (!existing) {
      res.status(404).json({ message: 'Invite not found' });
      return;
    }

    if (!existing.is_used) {
      await prisma.inviteToken.update({
        where: { id: inviteId },
        data: { is_used: true },
      });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date();
    expires_at.setFullYear(expires_at.getFullYear() + 1);

    const invite = await prisma.inviteToken.create({
      data: { token, role: existing.role, expires_at },
    });

    const inviteLink = buildInviteLink(invite.token);
    res.json({ message: 'New invite link generated', inviteLink, token: invite.token, role: invite.role });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ message: 'Failed to resend invite' });
  }
};

export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword, autoGenerate } = req.body;
    const userId = parseInt(id as string);
    const admin = (req as any).user;

    let passwordToSet = newPassword ? String(newPassword) : '';
    if (autoGenerate) {
      passwordToSet = generateRandomPassword(8);
    }

    if (!passwordToSet || passwordToSet.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const password_hash = await bcrypt.hash(passwordToSet, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash,
        plain_password: passwordToSet,
        totp_enabled: false,
        totp_secret: null
      },
    });

    try {
      await prisma.systemLog.create({
        data: {
          user_id: admin?.id,
          user_name: admin?.name || 'Admin',
          action_type: 'UPDATE',
          module: 'Users',
          old_value: { action: 'password_reset', userId: user.id, userName: user.name } as any,
          new_value: { action: 'password_reset_complete', userId: user.id } as any,
          panel: 'Admin Panel',
        },
      });
    } catch {
      /* system log optional */
    }

    broadcastDataChange('users', 'update');
    res.json({
      message: `Password reset successfully for ${user.name}`,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      newPassword: passwordToSet,
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
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

    broadcastDataChange('users', 'delete');
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user: ' + (error.message || 'Unknown error') });
  }
};

export const adminDisable2FA = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const admin = (req as any).user;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totp_enabled: false, totp_secret: null },
    });

    try {
      await prisma.systemLog.create({
        data: {
          user_id: admin?.id,
          user_name: admin?.name || 'Admin',
          action_type: 'UPDATE',
          module: 'Users',
          old_value: { action: 'disable_2fa', userId: user.id, userName: user.name } as any,
          new_value: { action: 'disable_2fa_complete', userId: user.id } as any,
          panel: 'Admin Panel',
        },
      });
    } catch {
      /* system log optional */
    }

    broadcastDataChange('users', 'update');
    res.json({
      message: `2FA disabled successfully for ${user.name}`,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error('Admin disable 2FA error:', error);
    res.status(500).json({ message: 'Failed to disable 2FA' });
  }
};

