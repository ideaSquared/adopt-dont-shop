import { Router } from 'express';
import AuthController, { authValidation } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /auth/register
router.post('/register', authValidation.register, AuthController.register);

// POST /auth/login
router.post('/login', authValidation.login, AuthController.login);

// POST /auth/logout
router.post('/logout', authenticateToken, AuthController.logout);

// POST /auth/refresh-token
router.post('/refresh-token', AuthController.refreshToken);

// POST /auth/forgot-password
router.post('/forgot-password', authValidation.passwordReset, AuthController.requestPasswordReset);

// POST /auth/reset-password
router.post(
  '/reset-password',
  authValidation.passwordResetConfirm,
  AuthController.confirmPasswordReset
);

// GET /auth/verify-email/:token
router.get('/verify-email/:token', AuthController.verifyEmail);

// POST /auth/resend-verification
router.post(
  '/resend-verification',
  authValidation.resendVerification,
  AuthController.resendVerificationEmail
);

// GET /auth/me
router.get('/me', authenticateToken, AuthController.getCurrentUser);

export default router;
