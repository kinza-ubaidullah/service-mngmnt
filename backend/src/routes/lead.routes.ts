import { Router } from 'express';
import { getLeads, createLead, updateLead, assignLead, unassignLead, getMyJobs, updateLeadOutcome, reopenLead, approveLead, lookupCustomer, deleteLead, getLeadHistory, resolveLocation } from '../controllers/lead.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/lookup', lookupCustomer);
router.get('/', getLeads);
router.get('/technician/my-jobs', authorizeRole(['TECHNICIAN', 'ADMIN']), getMyJobs);

router.post('/resolve-location', authorizeRole(['ADMIN', 'CALL_CENTER']), resolveLocation);
router.post('/', authorizeRole(['ADMIN', 'CALL_CENTER']), createLead);
router.put('/:id', authorizeRole(['ADMIN', 'CALL_CENTER']), updateLead);
router.patch('/:id/assign', authorizeRole(['ADMIN', 'CALL_CENTER']), assignLead);
router.patch('/:id/unassign', authorizeRole(['ADMIN', 'CALL_CENTER']), unassignLead);
router.get('/:id/history', getLeadHistory);

router.patch('/:id/outcome', authorizeRole(['TECHNICIAN', 'ADMIN']), updateLeadOutcome);
router.patch('/:id/reopen', authorizeRole(['ADMIN', 'CALL_CENTER']), reopenLead);
router.post('/:id/approve', authorizeRole(['ADMIN', 'CALL_CENTER']), approveLead);

// Admin and Call Center delete
router.delete('/:id', authorizeRole(['ADMIN', 'CALL_CENTER']), deleteLead);

export default router;
