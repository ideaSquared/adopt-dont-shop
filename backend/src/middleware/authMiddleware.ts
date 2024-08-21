// src/middlewares/authMiddleware.ts
import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Authentication token missing or invalid' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const secretKey = process.env.SECRET_KEY as string
    const decoded = jwt.verify(token, secretKey)

    // Attach the user ID from the token to the request object
    req.user = (decoded as any).userId

    next()
  } catch (error) {
    res.status(403).json({ message: 'Forbidden' })
  }
}

export const isAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY as string) as any
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    req.user = decoded // Attach user info to request object
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
