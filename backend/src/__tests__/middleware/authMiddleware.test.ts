import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { authenticateJWT } from '../../middleware/authMiddleware'
import { User } from '../../Models'

// Mock services and dependencies
jest.mock('jsonwebtoken')
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(), // Mock the logAction method
    getAllLogs: jest.fn(),
    getLogsByUserId: jest.fn(),
  },
}))

// Mock the User model's findByPk method
jest.mock('../../Models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}))

// Set a dummy secret key for testing purposes
process.env.SECRET_KEY = 'testsecret'

const app = express()
app.use(express.json())

// Dummy route to test middleware
app.get('/protected', authenticateJWT, (req: Request, res: Response) => {
  res.status(200).json({ message: 'Success', user: (req as any).user })
})

describe('authenticateJWT Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if authorization header is missing', async () => {
    const response = await request(app).get('/protected')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(
      'Authentication token missing or invalid',
    )
  })

  it('should return 401 if authorization header does not start with "Bearer "', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'InvalidToken')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(
      'Authentication token missing or invalid',
    )
  })

  it('should return 403 if token is invalid', async () => {
    ;(jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalidtoken')

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('Forbidden')
  })

  it('should proceed to the next middleware if token is valid', async () => {
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '123' }))

    // Mock the User.findByPk to return a valid user object
    ;(User.findByPk as jest.Mock).mockResolvedValue({ user_id: '123' })

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer validtoken')

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Success')
    expect(response.body.user.user_id).toBe('123')
  })
})
