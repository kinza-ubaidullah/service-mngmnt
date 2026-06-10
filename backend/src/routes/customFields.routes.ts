import express from 'express';
import { getCustomFields, createCustomField, deleteCustomField } from '../controllers/customFields.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/', authorizeRole(['ADMIN']), getCustomFields);
router.post('/', authorizeRole(['ADMIN']), createCustomField);
router.delete('/:id', authorizeRole(['ADMIN']), deleteCustomField);

export default router;
