// src/controllers/userController.ts
import { Request, Response } from 'express'
import { loginUser, logoutUser } from '../services/authService'

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    const token = await loginUser(email, password)
    res.status(200).json({ token })
  } catch (error) {
    const typedError = error as Error
    res.status(400).json({ message: typedError.message })
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (token) {
      await logoutUser(token)
      res.status(200).json({ message: 'Logged out successfully' })
    } else {
      res.status(400).json({ message: 'No token provided' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging out' })
  }
}
