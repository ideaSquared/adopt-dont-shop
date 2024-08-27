import express, { Application } from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { loginController } from '../../controllers/userController'
import { loginUser } from '../../services/authService'

// Mock services and dependencies
jest.mock('../../services/authService')
jest.mock('../../Models', () => ({
  AuditLog: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
}))
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
    getAllLogs: jest.fn(),
    getLogsByUserId: jest.fn(),
  },
}))

const app: Application = express()
app.use(express.json())

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // Preserves other methods in the jwt module if needed
  verify: jest.fn(), // Mocks the verify method specifically
}))

describe('User Controller', () => {
  beforeAll(() => {
    // Mock jwt.verify to return a decoded token with userId '1'
    ;(jwt.verify as jest.Mock).mockImplementation(() => ({ userId: '1' }))
  })

  describe('login', () => {
    app.post('/api/login', loginController)

    it('should return 200 and token on successful login', async () => {
      const mockUser = { user_id: 1, email: 'tester@test.com' }
      ;(loginUser as jest.Mock).mockResolvedValue({
        token: 'mocked-token',
        user: mockUser,
      })

      const response = await request(app)
        .post('/api/login')
        .send({ email: 'tester@test.com', password: '123456' })

      expect(response.status).toBe(200)
      expect(response.body.token).toBe('mocked-token')
      expect(response.body.user).toEqual(mockUser)
    })

    it('should return 400 if email or password is missing', async () => {
      const response = await request(app).post('/api/login').send({ email: '' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Email and password are required')
    })

    it('should return 400 if login fails', async () => {
      ;(loginUser as jest.Mock).mockRejectedValue(
        new Error('Invalid email or password'),
      )

      const response = await request(app)
        .post('/api/login')
        .send({ email: 'tester@test.com', password: 'wrong-password' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Invalid email or password')
    })
  })

  // Continue with the other test cases...
})
