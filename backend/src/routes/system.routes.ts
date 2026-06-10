import express from 'express';
import { getLogs, getTrash, restoreTrash, deleteTrash } from '../controllers/system.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/logs', authorizeRole(['ADMIN']), getLogs);
router.get('/trash', authorizeRole(['ADMIN']), getTrash);
router.post('/trash/:id/restore', authorizeRole(['ADMIN']), restoreTrash);
router.delete('/trash/:id', authorizeRole(['ADMIN']), deleteTrash);

export default router;
