import { Router } from 'express';

import AuthController, { authValidation } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /auth/register
router.post('/register', authLimiter, authValidation.register, AuthController.register);

// POST /auth/login
router.post('/login', authLimiter, authValidation.login, AuthController.login);

// POST /auth/logout
router.post('/logout', authenticateToken, AuthController.logout);

// POST /auth/refresh-token
router.post('/refresh-token', authLimiter, AuthController.refreshToken);

// POST /auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetLimiter,
  authValidation.forgotPassword,
  AuthController.requestPasswordReset
);

// POST /auth/reset-password
router.post(
  '/reset-password',
  passwordResetLimiter,
  authValidation.resetPassword,
  AuthController.confirmPasswordReset
);

// GET /auth/verify-email/:token
router.get('/verify-email/:token', AuthController.verifyEmail);

// POST /auth/resend-verification
router.post(
  '/resend-verification',
  authLimiter,
  authValidation.resendVerification,
  AuthController.resendVerificationEmail
);

// GET /auth/me
router.get('/me', authenticateToken, AuthController.getCurrentUser);

export default router;
