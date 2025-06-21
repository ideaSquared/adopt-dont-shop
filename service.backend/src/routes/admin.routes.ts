import express from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { authLimiter, generalLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply authentication and admin role requirement to all admin routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

// Platform metrics and dashboard
router.get('/metrics', generalLimiter, AdminController.getPlatformMetrics);

router.get('/analytics/usage', generalLimiter, AdminController.getUsageAnalytics);

// System health and monitoring
router.get('/system/health', generalLimiter, AdminController.getSystemHealth);

router.get('/system/config', generalLimiter, AdminController.getConfiguration);

router.patch('/system/config', authLimiter, AdminController.updateConfiguration);

// User management
router.get('/users', generalLimiter, AdminController.searchUsers);

router.get('/users/:userId', generalLimiter, AdminController.getUserDetails);

router.patch('/users/:userId/action', authLimiter, AdminController.performUserAction);

// Rescue organization management
router.get('/rescues', generalLimiter, AdminController.getRescueManagement);

router.patch('/rescues/:rescueId/moderate', authLimiter, AdminController.moderateRescue);

// Audit logs and monitoring
router.get('/audit-logs', generalLimiter, AdminController.getAuditLogs);

// Data export
router.get(
  '/export/:type',
  authLimiter, // More restrictive rate limiting for data export
  AdminController.exportData
);

export default router;
