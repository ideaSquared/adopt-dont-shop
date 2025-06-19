import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';
import { ApiError } from '../middleware/errorHandler';
import { config } from '../config';
import { logger } from '../utils/logger';

// User registration
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: UserRole.USER,
    });

    // Generate verification token
    const verificationToken = generateToken(user.id, '24h');
    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email (to be implemented)
    // await sendVerificationEmail(user.email, verificationToken);

    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// User login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if password is correct
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ApiError(403, 'Please verify your email to login');
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Return success response with token
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Email verification
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    // Decode token to get user ID
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    } catch (error) {
      throw new ApiError(400, 'Invalid or expired token');
    }

    // Find user by ID and verification token
    const user = await User.findOne({
      where: {
        id: decoded.id,
        verificationToken: token,
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired token');
    }

    // Check if token is expired
    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
      throw new ApiError(400, 'Verification token has expired');
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiresAt = null;
    await user.save();

    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Password reset request
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal user existence, but still return 200 status
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive password reset instructions',
      });
    }

    // Generate reset token
    const resetToken = generateToken(user.id, '1h');
    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email (to be implemented)
    // await sendPasswordResetEmail(user.email, resetToken);

    logger.info(`Password reset token generated for user: ${user.id}`);

    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'If your email is registered, you will receive password reset instructions',
    });
  } catch (error) {
    next(error);
  }
};

// Password reset
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Decode token to get user ID
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    } catch (error) {
      throw new ApiError(400, 'Invalid or expired token');
    }

    // Find user by ID and reset token
    const user = await User.findOne({
      where: {
        id: decoded.id,
        resetPasswordToken: token,
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired token');
    }

    // Check if token is expired
    if (user.resetPasswordTokenExpiresAt && user.resetPasswordTokenExpiresAt < new Date()) {
      throw new ApiError(400, 'Reset token has expired');
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiresAt = null;
    await user.save();

    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate JWT token
const generateToken = (userId: string, expiresIn: string = config.jwt.expiresIn): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, { expiresIn });
};
