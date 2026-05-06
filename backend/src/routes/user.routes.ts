import { Router } from 'express';
import { 
  getTechnicians, 
  createUser, 
  getAllUsers, 
  toggleUserActive, 
  generateInviteLink, 
  registerViaInvite, 
  updateProfile 
} from '../controllers/user.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public registration route
router.post('/invite/register', registerViaInvite);

// Protected routes
router.use(authenticate);

router.get('/technicians', authorizeRole(['ADMIN', 'CALL_CENTER']), getTechnicians);
router.get('/', authorizeRole(['ADMIN']), getAllUsers);
router.post('/', authorizeRole(['ADMIN']), createUser);
router.patch('/:id/toggle-active', authorizeRole(['ADMIN']), toggleUserActive);

router.post('/invite', authorizeRole(['ADMIN']), generateInviteLink);
router.patch('/profile', updateProfile);

export default router;
