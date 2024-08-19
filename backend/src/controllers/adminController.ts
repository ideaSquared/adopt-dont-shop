import { Request, Response } from 'express'
import { getAllUsersService } from '../services/adminService'

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
