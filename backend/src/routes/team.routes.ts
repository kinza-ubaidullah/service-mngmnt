import { Router } from 'express';
import { getTeams, createTeam, updateTeam, assignUserToTeam, deleteTeam } from '../controllers/team.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(['ADMIN']));

router.get('/', getTeams);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/assign', assignUserToTeam);

export default router;
