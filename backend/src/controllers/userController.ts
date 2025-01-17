import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuditLogger } from '../services/auditLogService'
import {
  changePassword,
  completeAccountSetupService,
  createUser,
  forgotPassword,
  getAllUsersService,
  loginUser,
  resetPassword,
  updateUserDetails,
  verifyEmailToken,
} from '../services/authService'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'
import { LoginResponse } from '../types/LoginResponse'

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      AuditLogger.logAction(
        'UserController',
        'Login attempt failed: Missing email or password',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'AUTHENTICATION'),
      )
      res.status(400).json({ message: 'Email and password are required' })
      return
    }

    AuditLogger.logAction(
      'UserController',
      `Login attempt for email: ${email}`,
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'AUTHENTICATION'),
    )

    const { token, user, rescue } = await loginUser(email, password)

    AuditLogger.logAction(
      'UserController',
      `Successful login for user: ${user.user_id}`,
      'INFO',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'AUTHENTICATION'),
    )

    const response: LoginResponse = { token, user }
    if (rescue) response['rescue'] = rescue

    res.status(200).json(response)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Login failed: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'AUTHENTICATION'),
    )

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' })
    } else if ((error as Error).message === 'Invalid email or password') {
      res.status(400).json({ message: 'Invalid email or password' })
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' })
    }
  }
}

export const updateUserController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId } = req.params
  const updatedData = req.body

  try {
    if (!req.user) {
      AuditLogger.logAction(
        'UserController',
        'Update attempt without authentication',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(401).json({ message: 'Not authenticated' })
      return
    }

    // Check if the logged-in user is trying to update their own details
    if (req.user.user_id !== userId) {
      AuditLogger.logAction(
        'UserController',
        `Unauthorized attempt to update user ${userId} by user ${req.user.user_id}`,
        'WARNING',
        req.user.user_id,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(403).json({
        message: "You are not authorized to update this user's details",
      })
      return
    }

    AuditLogger.logAction(
      'UserController',
      `Attempting to update user ${userId}`,
      'INFO',
      req.user.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const updatedUser = await updateUserDetails(userId, updatedData)

    if (!updatedUser) {
      AuditLogger.logAction(
        'UserController',
        `User not found: ${userId}`,
        'WARNING',
        req.user.user_id,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(404).json({ message: 'User not found' })
      return
    }

    AuditLogger.logAction(
      'UserController',
      `Successfully updated user ${userId}`,
      'INFO',
      req.user.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(200).json(updatedUser)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to update user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    res.status(400).json({ message: errorMessage })
  }
}

export const changePasswordController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { userId } = req.params
  const { currentPassword, newPassword } = req.body

  try {
    if (!req.user) {
      AuditLogger.logAction(
        'UserController',
        'Password change attempt without authentication',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(401).json({ message: 'Not authenticated' })
      return
    }

    if (!currentPassword || !newPassword) {
      AuditLogger.logAction(
        'UserController',
        'Password change attempt with missing passwords',
        'WARNING',
        req.user.user_id,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res
        .status(400)
        .json({ message: 'Current and new passwords are required' })
      return
    }

    // Ensure user is updating their own password
    if (req.user.user_id !== userId) {
      AuditLogger.logAction(
        'UserController',
        `Unauthorized attempt to change password for user ${userId} by user ${req.user.user_id}`,
        'WARNING',
        req.user.user_id,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(403).json({
        message: "You are not authorized to change this user's password",
      })
      return
    }

    AuditLogger.logAction(
      'UserController',
      `Attempting to change password for user ${userId}`,
      'INFO',
      req.user.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    await changePassword(userId, currentPassword, newPassword)

    AuditLogger.logAction(
      'UserController',
      `Successfully changed password for user ${userId}`,
      'INFO',
      req.user.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(200).json({ message: 'Password changed successfully' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to change password for user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    res.status(400).json({ message: errorMessage })
  }
}

export const forgotPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body

  try {
    if (!email) {
      AuditLogger.logAction(
        'UserController',
        'Password reset attempt without email',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(400).json({ message: 'Email is required' })
      return
    }

    AuditLogger.logAction(
      'UserController',
      `Password reset requested for email: ${email}`,
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const success = await forgotPassword(email)

    if (success) {
      AuditLogger.logAction(
        'UserController',
        `Password reset email sent to: ${email}`,
        'INFO',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(200).json({ message: 'Password reset link sent!' })
    } else {
      AuditLogger.logAction(
        'UserController',
        `Password reset requested for non-existent email: ${email}`,
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Email not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Error in password reset: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to process password reset' })
  }
}

export const resetPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { resetToken, newPassword } = req.body

  try {
    if (!resetToken || !newPassword) {
      AuditLogger.logAction(
        'UserController',
        'Password reset attempt with missing token or password',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res
        .status(400)
        .json({ message: 'Reset token and new password are required' })
      return
    }

    AuditLogger.logAction(
      'UserController',
      'Attempting to reset password with token',
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const success = await resetPassword(resetToken, newPassword)

    if (success) {
      AuditLogger.logAction(
        'UserController',
        'Password reset successful',
        'INFO',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(200).json({ message: 'Password reset successful!' })
    } else {
      AuditLogger.logAction(
        'UserController',
        'Password reset failed: Invalid or expired token',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(400).json({ message: 'Invalid or expired token' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Error in password reset: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to reset password' })
  }
}

export const createUserAccountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { first_name, last_name, email, password } = req.body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      AuditLogger.logAction(
        'UserController',
        'User creation attempt with invalid email',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      return res
        .status(400)
        .json({ message: 'Email is required and must be a string' })
    }

    if (!password) {
      AuditLogger.logAction(
        'UserController',
        'User creation attempt without password',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      return res.status(400).json({ message: 'Password is required' })
    }

    AuditLogger.logAction(
      'UserController',
      `Attempting to create user account for email: ${email}`,
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const userData = { first_name, last_name, email, password }
    const { user } = await createUser(userData)

    AuditLogger.logAction(
      'UserController',
      `Successfully created user account: ${user.user_id}`,
      'INFO',
      user.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(201).json({ message: 'User created successfully', user })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to create user account: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res
        .status(500)
        .json({ message: 'Error creating user account', error: error.message })
    } else {
      res.status(500).json({ message: 'Unknown error occurred' })
    }
  }
}

export const createRescueAccountController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { user, rescue } = req.body

    // Validate user fields
    if (!user?.email || typeof user.email !== 'string') {
      AuditLogger.logAction(
        'UserController',
        'Rescue account creation attempt with invalid email',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      return res
        .status(400)
        .json({ message: 'Email is required and must be a string' })
    }

    if (!user?.password) {
      AuditLogger.logAction(
        'UserController',
        'Rescue account creation attempt without password',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      return res.status(400).json({ message: 'Password is required' })
    }

    AuditLogger.logAction(
      'UserController',
      `Attempting to create rescue account for email: ${user.email}`,
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    // Extract fields from the nested objects
    const userData = {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: user.password,
    }

    const rescueData = {
      rescue_type: rescue.rescue_type,
      rescue_name: rescue.rescue_name,
      city: rescue.city,
      country: rescue.country,
      reference_number: rescue.reference_number,
    }

    const {
      user: createdUser,
      rescue: createdRescue,
      staffMember,
    } = await createUser(userData, rescueData)

    AuditLogger.logAction(
      'UserController',
      `Successfully created rescue account: ${createdUser.user_id}, rescue: ${createdRescue?.rescue_id}`,
      'INFO',
      createdUser.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(201).json({
      message: 'Rescue and user created successfully',
      user: createdUser,
      rescue: createdRescue,
      staffMember,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to create rescue account: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(500).json({
        message: 'Error creating rescue account',
        error: error.message,
      })
    } else {
      res.status(500).json({ message: 'Unknown error occurred' })
    }
  }
}

export const verifyEmailController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.query

    if (!token) {
      AuditLogger.logAction(
        'UserController',
        'Email verification attempt without token',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      res.status(400).json({ message: 'Verification token is required' })
      return
    }

    AuditLogger.logAction(
      'UserController',
      'Attempting to verify email with token',
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const user = await verifyEmailToken(token as string)

    AuditLogger.logAction(
      'UserController',
      `Successfully verified email for user: ${user?.user_id}`,
      'INFO',
      user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(200).json({
      message: 'Email verified successfully!',
      user_id: user?.user_id,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to verify email: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    res.status(400).json({ message: errorMessage })
  }
}

export const getAllUsersController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    AuditLogger.logAction(
      'UserController',
      'Attempting to fetch all users',
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const response = await getAllUsersService()

    AuditLogger.logAction(
      'UserController',
      `Successfully fetched ${response.users.length} users`,
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(200).json(response)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to fetch users: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to fetch users' })
  }
}

export const completeAccountSetupController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      AuditLogger.logAction(
        'UserController',
        'Account setup attempt with missing token or password',
        'WARNING',
        null,
        AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
      )
      return res
        .status(400)
        .json({ message: 'Token and password are required' })
    }

    AuditLogger.logAction(
      'UserController',
      'Attempting to complete account setup',
      'INFO',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    const result = await completeAccountSetupService(token, password)

    AuditLogger.logAction(
      'UserController',
      `Successfully completed account setup for user: ${result.user.user_id}`,
      'INFO',
      result.user.user_id,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )

    res.status(200).json({
      message: 'Account setup completed successfully',
      user: result.user,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'UserController',
      `Failed to complete account setup: ${errorMessage}`,
      'ERROR',
      null,
      AuditLogger.getAuditOptions(req, 'USER_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res.status(400).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' })
    }
  }
}
