// src/controllers/userController.ts
import { Request, Response } from 'express'
import { loginUser } from '../services/authService'

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    const { token, user } = await loginUser(email, password)
    res.status(200).json({ token, user })
  } catch (error) {
    const typedError = error as Error
    res.status(400).json({ message: typedError.message })
  }
}
