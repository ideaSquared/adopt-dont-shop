import { Router } from 'express';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';

const router = Router();

// Apply admin role requirement to all routes
router.use(requireRole([UserType.ADMIN]));

// ... existing code ...
