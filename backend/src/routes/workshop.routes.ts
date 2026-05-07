import { Router } from 'express';
import { getWorkshopJobs, updateWorkshopStatus, deleteWorkshopJob } from '../controllers/workshop.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(['ADMIN', 'TECHNICIAN']));

router.get('/jobs', getWorkshopJobs);
router.patch('/jobs/:id/status', updateWorkshopStatus);
router.delete('/jobs/:id', deleteWorkshopJob);

export default router;
