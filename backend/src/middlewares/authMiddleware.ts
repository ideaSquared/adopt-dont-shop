// src/middlewares/authMiddleware.ts
import { NextFunction, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' })
    return
  }

  try {
    // Check if token is blacklisted
    // const blacklisted = await TokenBlacklist.findOne({ where: { token } })
    // if (blacklisted) {
    //   res.status(401).json({ message: 'Token is invalid or expired.' })
    //   return
    // }

    const decoded = jwt.verify(token, process.env.SECRET_KEY as string)
    req.user = decoded
    next()
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' })
  }
}
