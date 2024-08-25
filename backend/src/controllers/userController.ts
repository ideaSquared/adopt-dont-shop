import { Request, Response } from 'express'
import {
  changePassword,
  createUser,
  forgotPassword,
  getAllUsersService,
  loginUser,
  resetPassword,
  updateUserDetails,
  verifyEmailToken,
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
      return
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
    if (req.user !== userId.toString()) {
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

export const createUserAccount = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password } = req.body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return res
        .status(400)
        .json({ message: 'Email is required and must be a string' })
    }

    if (!password) {
      return res.status(400).json({ message: 'Passwords is required' })
    }

    const userData = { first_name, last_name, email, password }
    const { user } = await createUser(userData)

    res.status(201).json({ message: 'User created successfully', user })
  } catch (error) {
    if (error instanceof Error) {
      res
        .status(500)
        .json({ message: 'Error creating user account', error: error.message })
    } else {
      res.status(500).json({ message: 'Unknown error occurred' })
    }
  }
}

export const createRescueAccount = async (req: Request, res: Response) => {
  try {
    const { user, rescue } = req.body

    // Validate user fields
    if (!user?.email || typeof user.email !== 'string') {
      return res
        .status(400)
        .json({ message: 'Email is required and must be a string' })
    }

    if (!user?.password) {
      return res.status(400).json({ message: 'Passwords is required' })
    }

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

    res.status(201).json({
      message: 'Rescue and user created successfully',
      user: createdUser,
      rescue: createdRescue,
      staffMember,
    })
  } catch (error) {
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

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.query

    if (!token) {
      res.status(400).json({ message: 'Verification token is required' })
      return
    }

    const user = await verifyEmailToken(token as string)

    res.status(200).json({
      message: 'Email verified successfully!',
      user_id: user?.user_id,
    })
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
}

export const getAllUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const users = await getAllUsersService()
    res.status(200).json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error retrieving users' })
  }
}
