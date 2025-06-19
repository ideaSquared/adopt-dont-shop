import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

const router = Router();

// User registration endpoint
router.post(
  '/register',
  [
    body('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .isString()
      .withMessage('First name must be a string')
      .trim(),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .isString()
      .withMessage('Last name must be a string')
      .trim(),
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage(
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'
      ),
  ],
  validateRequest,
  authController.register
);

// User login endpoint
router.post(
  '/login',
  [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  authController.login
);

// Email verification endpoint
router.get(
  '/verify-email/:token',
  [param('token').notEmpty().withMessage('Token is required')],
  validateRequest,
  authController.verifyEmail
);

// Forgot password endpoint
router.post(
  '/forgot-password',
  [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
  ],
  validateRequest,
  authController.forgotPassword
);

// Reset password endpoint
router.post(
  '/reset-password/:token',
  [
    param('token').notEmpty().withMessage('Token is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage(
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'
      ),
  ],
  validateRequest,
  authController.resetPassword
);

export default router;
