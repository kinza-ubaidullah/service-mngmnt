import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/change-password', authenticate, changePassword);

export default router;
