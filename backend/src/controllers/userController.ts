import { Request, Response } from 'express'
import { loginUser, updateUserDetails } from '../services/authService'
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
