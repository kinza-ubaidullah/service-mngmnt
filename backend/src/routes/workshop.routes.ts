import { Router } from 'express';
import { getWorkshopJobs, updateWorkshopStatus, deleteWorkshopJob, assignDeliveryTechnician } from '../controllers/workshop.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/jobs', authorizeRole(['ADMIN', 'TECHNICIAN', 'CALL_CENTER', 'WORKSHOP_MANAGER']), getWorkshopJobs);
router.patch('/jobs/:id/status', authorizeRole(['ADMIN', 'CALL_CENTER', 'WORKSHOP_MANAGER']), updateWorkshopStatus);
router.patch('/jobs/:id/assign-delivery', authorizeRole(['ADMIN', 'WORKSHOP_MANAGER', 'CALL_CENTER']), assignDeliveryTechnician);
router.delete('/jobs/:id', authorizeRole(['ADMIN', 'CALL_CENTER', 'WORKSHOP_MANAGER']), deleteWorkshopJob);

export default router;
