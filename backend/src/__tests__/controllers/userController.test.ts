import express, { Application } from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import {
  completeAccountSetupController,
  loginController,
} from '../../controllers/userController'
import { completeAccountSetupService } from '../../services/authService'

// Mock services and dependencies
jest.mock('../../services/authService', () => ({
  loginUser: jest.fn(),
  completeAccountSetupService: jest.fn(),
}))
jest.mock('../../Models', () => ({
  AuditLog: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
}))
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    getAuditOptions: jest.fn().mockReturnValue({}),
    logAction: jest.fn(),
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
  })

  describe('completeAccountSetup', () => {
    app.post('/api/complete-account-setup', completeAccountSetupController)

    it('should return 200 and account setup result on successful setup', async () => {
      const mockResult = {
        message: 'Account setup completed successfully',
        user: { user_id: 1, email: 'tester@test.com' },
      }
      ;(completeAccountSetupService as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/api/complete-account-setup')
        .send({ token: 'valid-token', password: 'new-password' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockResult)
    })

    it('should return 400 if token or password is missing', async () => {
      const response = await request(app)
        .post('/api/complete-account-setup')
        .send({ token: 'valid-token' }) // Missing password

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Token and password are required')
    })

    it('should return 400 if unexpected error occurs', async () => {
      ;(completeAccountSetupService as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const response = await request(app)
        .post('/api/complete-account-setup')
        .send({ token: 'valid-token', password: 'new-password' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Unexpected error')
    })
  })
})
