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
  getInviteDetails
} from '../controllers/user.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public registration routes
router.post('/invite/register', registerViaInvite);
router.get('/invite/:token', getInviteDetails);

// Protected routes
router.use(authenticate);

router.get('/technicians', authorizeRole(['ADMIN', 'CALL_CENTER']), getTechnicians);
router.get('/', authorizeRole(['ADMIN']), getAllUsers);
router.post('/', authorizeRole(['ADMIN']), createUser);
router.patch('/:id/toggle-active', authorizeRole(['ADMIN']), toggleUserActive);
router.delete('/:id', authorizeRole(['ADMIN']), deleteUser);

router.post('/invite', authorizeRole(['ADMIN']), generateInviteLink);
router.patch('/profile', updateProfile);

export default router;
