import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createPost, getPosts, deletePost } from '../controllers/post.controller';

const router = Router();
router.use(authenticate);

router.get('/', getPosts);
router.post('/', createPost);
router.delete('/:id', deletePost);

export default router;
