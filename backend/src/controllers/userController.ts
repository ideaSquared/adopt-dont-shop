import { Request, Response } from 'express'
import {
  changePassword,
  forgotPassword,
  loginUser,
  resetPassword,
  updateUserDetails,
} from '../services/authService'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    // Check if email and password are provided
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' })
      return
    }

    const { token, user } = await loginUser(email, password)
    res.status(200).json({ token, user })
  } catch (error) {
    const typedError = error as Error
    res.status(400).json({ message: 'Invalid email or password' })
  }
}

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params
    const updatedData = req.body

    // Check if the logged-in user is trying to update their own details
    if (req.user !== userId) {
      res.status(403).json({
        message: "You are not authorized to update this user's details",
      })
    }

    const updatedUser = await updateUserDetails(userId, updatedData)

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    res.status(200).json(updatedUser)
  } catch (error) {
    const typedError = error as Error
    res.status(400).json({ message: typedError.message })
  }
}

export const changePasswordHandler = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params // Assuming userId is passed in the URL
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json({ message: 'Current and new passwords are required' })
      return
    }

    // Ensure user is updating their own password
    if (req.user !== userId) {
      res.status(403).json({
        message: "You are not authorized to change this user's password",
      })
      return
    }

    await changePassword(userId, currentPassword, newPassword)
    res.status(200).json({ message: 'Password changed successfully' })
  } catch (error) {
    const typedError = error as Error
    res.status(400).json({ message: typedError.message })
  }
}

export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body

  const success = await forgotPassword(email)
  if (success) {
    res.status(200).json({ message: 'Password reset link sent!' })
  } else {
    res.status(404).json({ message: 'Email not found' })
  }
}

export const resetPasswordHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { resetToken, newPassword } = req.body

  const success = await resetPassword(resetToken, newPassword)
  if (success) {
    res.status(200).json({ message: 'Password reset successful!' })
  } else {
    res.status(400).json({ message: 'Invalid or expired token' })
  }
}
