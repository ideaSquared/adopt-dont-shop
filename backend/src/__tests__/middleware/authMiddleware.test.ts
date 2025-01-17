import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { authRoleOwnershipMiddleware } from '../../middleware/authRoleOwnershipMiddleware'
import { User } from '../../Models'
import {
  getRolesForUser,
  verifyUserHasRole,
} from '../../services/permissionService'
import { verifyRescueOwnership } from '../../services/rescueService'

// Mock services and dependencies
jest.mock('jsonwebtoken')
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    getAuditOptions: jest.fn().mockReturnValue({}),
    logAction: jest.fn(),
  },
}))

jest.mock('../../services/permissionService', () => ({
  verifyUserHasRole: jest.fn(),
  getRolesForUser: jest.fn(),
}))

jest.mock('../../services/rescueService', () => ({
  verifyRescueOwnership: jest.fn(),
}))

// Mock the User model's findByPk method
jest.mock('../../Models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  AuditLog: {
    create: jest.fn(),
  },
}))

// Set a dummy secret key for testing purposes
process.env.SECRET_KEY = 'testsecret'

const app = express()
app.use(express.json())

// Test routes
app.get(
  '/protected',
  authRoleOwnershipMiddleware(),
  (req: Request, res: Response) => {
    res.status(200).json({ message: 'Success', user: (req as any).user })
  },
)

app.get(
  '/protected-with-role',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  (req: Request, res: Response) => {
    res.status(200).json({ message: 'Success', user: (req as any).user })
  },
)

app.get(
  '/protected-with-ownership/:rescueId',
  authRoleOwnershipMiddleware({ verifyRescueOwnership: true }),
  (req: Request, res: Response) => {
    res.status(200).json({ message: 'Success', user: (req as any).user })
  },
)

describe('authRoleOwnershipMiddleware', () => {
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

  it('should return 401 if token is invalid', async () => {
    ;(jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.JsonWebTokenError('Invalid token')
    })

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalidtoken')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('JWT token expired or invalid')
  })

  it('should proceed to the next middleware if token is valid', async () => {
    const mockUser = { user_id: '123', username: 'testuser' }
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '123' }))
    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer validtoken')

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Success')
    expect(response.body.user).toEqual(mockUser)
  })

  it('should check role when requiredRole is specified', async () => {
    const mockUser = { user_id: '123', username: 'testuser' }
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '123' }))
    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)
    ;(verifyUserHasRole as jest.Mock).mockResolvedValue(true)
    ;(getRolesForUser as jest.Mock).mockResolvedValue(['user'])

    const response = await request(app)
      .get('/protected-with-role')
      .set('Authorization', 'Bearer validtoken')

    expect(response.status).toBe(200)
    expect(verifyUserHasRole).toHaveBeenCalledWith('123', 'admin')
  })

  it('should check rescue ownership when verifyRescueOwnership is true', async () => {
    const mockUser = { user_id: '123', username: 'testuser' }
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '123' }))
    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)
    ;(verifyRescueOwnership as jest.Mock).mockResolvedValue(true)
    ;(getRolesForUser as jest.Mock).mockResolvedValue(['user'])

    const response = await request(app)
      .get('/protected-with-ownership/rescue123')
      .set('Authorization', 'Bearer validtoken')

    expect(response.status).toBe(200)
    expect(verifyRescueOwnership).toHaveBeenCalledWith('123', 'rescue123')
  })

  it('should return 403 if user does not have required role', async () => {
    const mockUser = { user_id: '123', username: 'testuser' }
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '123' }))
    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)
    ;(verifyUserHasRole as jest.Mock).mockResolvedValue(false)
    ;(getRolesForUser as jest.Mock).mockResolvedValue(['user'])

    const response = await request(app)
      .get('/protected-with-role')
      .set('Authorization', 'Bearer validtoken')

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('Forbidden: Insufficient role')
  })

  it('should return 403 if user does not own the rescue', async () => {
    const mockUser = { user_id: '123', username: 'testuser' }
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '123' }))
    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)
    ;(verifyRescueOwnership as jest.Mock).mockResolvedValue(false)
    ;(getRolesForUser as jest.Mock).mockResolvedValue(['user'])

    const response = await request(app)
      .get('/protected-with-ownership/rescue123')
      .set('Authorization', 'Bearer validtoken')

    expect(response.status).toBe(403)
    expect(response.body.message).toBe(
      'Insufficient permissions for this rescue',
    )
  })
})
