import { Request, Response } from 'express'
import { getAllRescuesService } from '../services/rescueService'

export const getAllRescues = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rescues = await getAllRescuesService()
    res.status(200).json(rescues)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error retrieving rescues' })
  }
}
