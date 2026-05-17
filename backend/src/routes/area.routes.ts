import { Router } from 'express';
import { getAreas, createArea, deleteArea } from '../controllers/area.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getAreas); // Anyone logged in can get areas
router.post('/', authorizeRole(['ADMIN']), createArea);
router.delete('/:id', authorizeRole(['ADMIN']), deleteArea);

export default router;
