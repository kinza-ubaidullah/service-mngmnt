import { Router } from 'express';
import {
  login,
  getMe,
  changePassword,
  verify2FALogin,
  verify2FASetupLogin,
  get2FAStatus,
  setup2FA,
  enable2FA,
  disable2FA,
  forgotPasswordLookup,
  forgotPasswordReset,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/2fa/verify-login', verify2FALogin);
router.post('/2fa/setup-login', verify2FASetupLogin);

// Email OTP based password reset (new flow)
router.post('/forgot-password/send-otp', sendPasswordResetOtp);
router.post('/forgot-password/verify-otp', verifyPasswordResetOtp);

// Legacy routes (kept for backward compat)
router.post('/forgot-password/lookup', forgotPasswordLookup);
router.post('/forgot-password/reset', forgotPasswordReset);

router.get('/me', authenticate, getMe);
router.patch('/change-password', authenticate, changePassword);
router.get('/2fa/status', authenticate, get2FAStatus);
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/enable', authenticate, enable2FA);
router.post('/2fa/disable', authenticate, disable2FA);

export default router;

