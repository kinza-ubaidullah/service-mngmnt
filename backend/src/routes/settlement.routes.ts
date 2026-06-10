import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { getTechnicianWallet, markSettlementReceived, getAllTechnicianWallets } from '../controllers/settlement.controller';

const router = Router();
router.use(authenticate);

router.get('/all', authorizeRole(['ADMIN']), getAllTechnicianWallets);
router.get('/:technicianId', authorizeRole(['ADMIN', 'TECHNICIAN']), getTechnicianWallet);
router.post('/:technicianId/receive', authorizeRole(['ADMIN']), markSettlementReceived);

export default router;
