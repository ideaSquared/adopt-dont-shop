import { Router } from 'express';
import { MatchController } from '../controllers/match.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/profile', MatchController.getProfile);
router.put('/profile', MatchController.validateUpsertProfile, MatchController.upsertProfile);
router.get('/top-picks', MatchController.validateTopPicks, MatchController.getTopPicks);

export default router;
