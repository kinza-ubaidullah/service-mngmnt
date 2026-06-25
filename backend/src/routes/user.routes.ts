import { Router } from 'express';
import { 
  getTechnicians, 
  createUser, 
  getAllUsers, 
  toggleUserActive, 
  generateInviteLink, 
  registerViaInvite, 
  updateProfile,
  deleteUser,
  getInviteDetails,
  lookupUser,
  adminResetPassword,
  getPendingInvites,
  resendInvite,
  adminDisable2FA,
  updateLiveLocation,
} from '../controllers/user.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Public registration routes
router.post('/invite/register', registerViaInvite);
router.get('/invite/:token', getInviteDetails);

// Protected routes
router.use(authenticate);

router.get('/technicians', authorizeRole(['ADMIN', 'CALL_CENTER']), getTechnicians);
router.get('/lookup', authorizeRole(['ADMIN']), lookupUser);
router.get('/invites/pending', authorizeRole(['ADMIN']), getPendingInvites);
router.post('/invites/:id/resend', authorizeRole(['ADMIN']), resendInvite);
router.get('/', authorizeRole(['ADMIN']), getAllUsers);
router.post('/', authorizeRole(['ADMIN']), createUser);
router.patch('/:id/toggle-active', authorizeRole(['ADMIN']), toggleUserActive);
router.patch('/:id/reset-password', authorizeRole(['ADMIN']), adminResetPassword);
router.patch('/:id/disable-2fa', authorizeRole(['ADMIN']), adminDisable2FA);
router.delete('/:id', authorizeRole(['ADMIN']), deleteUser);

router.post('/invite', authorizeRole(['ADMIN']), generateInviteLink);
router.patch('/live-location', authorizeRole(['TECHNICIAN']), updateLiveLocation);
router.patch('/profile', updateProfile);

export default router;
