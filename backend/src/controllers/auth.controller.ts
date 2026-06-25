import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../utils/jwt.utils';
import { prisma } from '../utils/prisma';
import { generateTotpSecret, getTotpAuthUrl, verifyTotpCode } from '../utils/totp.utils';

const MFA_ROLES = ['ADMIN', 'TECHNICIAN', 'CALL_CENTER', 'WORKSHOP_MANAGER'];

const userResponse = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  is_active: user.is_active,
  team_id: user.team_id,
  location_name: user.location_name,
  specialization: user.specialization,
  lat: user.lat,
  lng: user.lng,
  address: user.address,
  profile_picture: user.profile_picture,
  plain_password: user.plain_password,
  totp_enabled: user.totp_enabled,
});

export const login = async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier || undefined },
          { phone: identifier || undefined },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ message: 'Your account is inactive' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.totp_enabled && user.totp_secret && MFA_ROLES.includes(user.role)) {
      const tempToken = signToken({ id: user.id, purpose: '2fa' }, '5m');
      res.json({
        message: '2FA required',
        requires2FA: true,
        tempToken,
        user: { id: user.id, name: user.name, role: user.role },
      });
      return;
    }

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      message: 'Login successful',
      token,
      user: userResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
};

export const verify2FALogin = async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      res.status(400).json({ message: 'Verification code is required' });
      return;
    }

    const decoded = verifyToken(tempToken) as { id?: number; purpose?: string };
    if (!decoded?.id || decoded.purpose !== '2fa') {
      res.status(401).json({ message: 'Session expired. Please login again.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.is_active || !user.totp_enabled || !user.totp_secret) {
      res.status(401).json({ message: 'Invalid 2FA session' });
      return;
    }

    if (!verifyTotpCode(user.totp_secret, code)) {
      res.status(401).json({ message: 'Invalid verification code' });
      return;
    }

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      message: 'Login successful',
      token,
      user: userResponse(user),
    });
  } catch (error) {
    console.error('2FA login error:', error);
    res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.json({ user: userResponse(user) });
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
      data: { password_hash, plain_password: newPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
};

export const get2FAStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const canUse2FA = MFA_ROLES.includes(user.role);
    res.json({
      canUse2FA,
      enabled: !!user.totp_enabled,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch 2FA status' });
  }
};

export const setup2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !MFA_ROLES.includes(user.role)) {
      res.status(403).json({ message: '2FA is not available for your account type' });
      return;
    }

    const secret = generateTotpSecret();
    const label = user.email || user.phone || user.name;
    const otpauthUrl = getTotpAuthUrl(label, secret);

    await prisma.user.update({
      where: { id: userId },
      data: { totp_secret: secret, totp_enabled: false },
    });

    res.json({
      secret,
      otpauthUrl,
      message: 'Scan the QR code in Google Authenticator, then enter the 6-digit code to enable 2FA.',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ message: 'Failed to start 2FA setup' });
  }
};

export const enable2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totp_secret) {
      res.status(400).json({ message: 'Start 2FA setup first' });
      return;
    }
    if (!verifyTotpCode(user.totp_secret, code)) {
      res.status(400).json({ message: 'Invalid verification code' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totp_enabled: true },
    });

    res.json({ message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to enable 2FA' });
  }
};

export const disable2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password, code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect password' });
      return;
    }

    if (user.totp_enabled && user.totp_secret && !verifyTotpCode(user.totp_secret, code)) {
      res.status(400).json({ message: 'Invalid verification code' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totp_enabled: false, totp_secret: null },
    });

    res.json({ message: 'Two-factor authentication disabled' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to disable 2FA' });
  }
};

/** Public — initiate admin password reset (uses Google Authenticator, not email) */
export const sendPasswordResetOtp = async (req: Request, res: Response) => {
  try {
    const identifier = String(req.body.email || req.body.phone || '').trim();
    if (!identifier) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
      select: { id: true, name: true, email: true, role: true, is_active: true, totp_enabled: true, totp_secret: true },
    });

    if (!user || !user.is_active) {
      res.json({ message: 'If an admin account exists with this email, you can proceed with authenticator verification.' });
      return;
    }

    if (user.role !== 'ADMIN') {
      res.json({
        found: true,
        canSelfReset: false,
        role: user.role,
        message: 'Please contact your administrator to reset your password.',
      });
      return;
    }

    if (!user.totp_enabled || !user.totp_secret) {
      res.status(400).json({
        message: 'Authenticator app is not set up on this admin account. Ask another admin to reset your password from Staff Management.',
      });
      return;
    }

    res.json({
      found: true,
      canSelfReset: true,
      useAuthenticator: true,
      message: 'Enter the 6-digit code from your Google Authenticator app.',
      maskedEmail: user.email
        ? user.email.replace(/(.)(.*)(@.*)/, (_: string, a: string, b: string, c: string) => a + '*'.repeat(b.length) + c)
        : '',
    });
  } catch (error: any) {
    const detail = error?.message || String(error);
    console.error('Password reset init error:', detail);
    res.status(500).json({
      message: 'Failed to start password reset. Please try again.',
      detail: detail.substring(0, 300),
    });
  }
};

/** Public — verify authenticator code and reset admin password */
export const verifyPasswordResetOtp = async (req: Request, res: Response) => {
  try {
    const identifier = String(req.body.email || req.body.phone || '').trim();
    const otp = String(req.body.otp || req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!identifier || !otp || !newPassword) {
      res.status(400).json({ message: 'Email, authenticator code and new password are required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });

    if (!user || !user.is_active || user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Account not found or not eligible for self-reset' });
      return;
    }

    if (!user.totp_enabled || !user.totp_secret) {
      res.status(400).json({ message: 'Authenticator is not enabled on this account.' });
      return;
    }

    if (!verifyTotpCode(user.totp_secret, otp)) {
      res.status(400).json({ message: 'Invalid authenticator code. Check Google Authenticator and try again.' });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash, plain_password: newPassword },
    });

    res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    console.error('Verify authenticator reset error:', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

// Keep old functions for backward compatibility (used internally)
export const forgotPasswordLookup = sendPasswordResetOtp;
export const forgotPasswordReset = verifyPasswordResetOtp;
