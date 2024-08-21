import express, { Application } from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import {
  changePasswordHandler,
  createRescueAccount,
  createUserAccount,
  forgotPasswordHandler,
  login,
  resetPasswordHandler,
  updateUser,
  verifyEmail,
} from '../../controllers/userController'
import { authenticateJWT } from '../../middleware/authMiddleware'
import {
  changePassword,
  createUser,
  forgotPassword,
  loginUser,
  resetPassword,
  updateUserDetails,
  verifyEmailToken,
} from '../../services/authService'

jest.mock('../../services/authService')

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
    app.post('/api/login', login)

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

  describe('updateUser', () => {
    app.put('/api/user/:userId', authenticateJWT, updateUser)

    it('should return 200 and updated user on successful update', async () => {
      const mockUser = { user_id: 1, email: 'newemail@test.com' }
      ;(updateUserDetails as jest.Mock).mockResolvedValue(mockUser)

      const response = await request(app)
        .put('/api/user/1')
        .send({ email: 'newemail@test.com' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockUser)
    })

    it('should return 403 if user is not authorized', async () => {
      const response = await request(app)
        .put('/api/user/2')
        .send({ email: 'newemail@test.com' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(403)
      expect(response.body.message).toBe(
        "You are not authorized to update this user's details",
      )
    })

    it('should return 404 if user is not found', async () => {
      ;(updateUserDetails as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/user/1')
        .send({ email: 'newemail@test.com' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(404)
      expect(response.body.message).toBe('User not found')
    })

    it('should return 400 if an error occurs', async () => {
      ;(updateUserDetails as jest.Mock).mockRejectedValue(
        new Error('Update error'),
      )

      const response = await request(app)
        .put('/api/user/1')
        .send({ email: 'newemail@test.com' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Update error')
    })
  })

  describe('changePasswordHandler', () => {
    app.post(
      '/api/user/:userId/change-password',
      authenticateJWT,
      changePasswordHandler,
    )

    it('should return 200 on successful password change', async () => {
      ;(changePassword as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .post('/api/user/1/change-password')
        .send({ currentPassword: '123456', newPassword: 'newpass123' })
        .set('Authorization', 'Bearer validtoken')

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Password changed successfully')
    })

    it('should return 403 if user is not authorized', async () => {
      const response = await request(app)
        .post('/api/user/2/change-password')
        .send({ currentPassword: '123456', newPassword: 'newpass123' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(403)
      expect(response.body.message).toBe(
        "You are not authorized to change this user's password",
      )
    })

    it('should return 400 if passwords are missing', async () => {
      const response = await request(app)
        .post('/api/user/1/change-password')
        .send({ currentPassword: '', newPassword: '' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'Current and new passwords are required',
      )
    })

    it('should return 400 if an error occurs', async () => {
      ;(changePassword as jest.Mock).mockRejectedValue(
        new Error('Password change error'),
      )

      const response = await request(app)
        .post('/api/user/1/change-password')
        .send({ currentPassword: '123456', newPassword: 'newpass123' })
        .set('Authorization', 'Bearer validtoken') // Simulating the req.user set by authenticateJWT

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Password change error')
    })
  })

  describe('forgotPasswordHandler', () => {
    app.post('/api/forgot-password', forgotPasswordHandler)

    it('should return 200 if password reset link is sent', async () => {
      ;(forgotPassword as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'tester@test.com' })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Password reset link sent!')
    })

    it('should return 404 if email is not found', async () => {
      ;(forgotPassword as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'nonexistent@test.com' })

      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Email not found')
    })
  })

  describe('resetPasswordHandler', () => {
    app.post('/api/reset-password', resetPasswordHandler)

    it('should return 200 if password is reset successfully', async () => {
      ;(resetPassword as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .post('/api/reset-password')
        .send({ resetToken: 'valid-token', newPassword: 'newpass123' })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Password reset successful!')
    })

    it('should return 400 if the token is invalid or expired', async () => {
      ;(resetPassword as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/reset-password')
        .send({ resetToken: 'invalid-token', newPassword: 'newpass123' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Invalid or expired token')
    })
  })

  describe('createUserAccount', () => {
    app.post('/api/user/create', createUserAccount)

    it('should return 201 and success message on successful creation', async () => {
      const mockUser = { user_id: 1, email: 'tester@test.com' }
      ;(createUser as jest.Mock).mockResolvedValue({ user: mockUser })

      const response = await request(app).post('/api/user/create').send({
        first_name: 'Testy',
        last_name: 'Testyerson',
        email: 'tester@test.com',
        password: '123456',
      })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('User created successfully')
      expect(response.body.user).toEqual(mockUser)
    })

    it('should return 400 if email is missing or invalid', async () => {
      const response = await request(app).post('/api/user/create').send({
        first_name: 'Testy',
        last_name: 'Testyerson',
        email: '',
        password: '123456',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'Email is required and must be a string',
      )
    })

    it('should return 400 if password is missing', async () => {
      const response = await request(app).post('/api/user/create').send({
        first_name: 'Testy',
        last_name: 'Testyerson',
        email: 'tester@test.com',
        password: '',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Passwords is required')
    })

    it('should return 500 if service throws an error', async () => {
      ;(createUser as jest.Mock).mockRejectedValue(new Error('Service error'))

      const response = await request(app).post('/api/user/create').send({
        first_name: 'Testy',
        last_name: 'Testyerson',
        email: 'tester@test.com',
        password: '123456',
      })

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error creating user account')
      expect(response.body.error).toBe('Service error')
    })
  })

  describe('createRescueAccount', () => {
    app.post('/api/rescue/create-rescue', createRescueAccount)

    const userData = {
      first_name: 'Testy',
      last_name: 'Testyerson',
      email: 'tester@test.com',
      password: '123456',
    }

    const rescueData = {
      rescue_type: 'charity',
      rescue_name: 'TestyiersCharity',
      city: 'TestLane',
      country: 'United Kingdom',
      reference_number: '',
    }

    it('should return 201 and success message on successful creation', async () => {
      ;(createUser as jest.Mock).mockResolvedValue({
        user: userData,
        rescue: rescueData,
        staffMember: { id: 1 },
      })

      const response = await request(app)
        .post('/api/rescue/create-rescue')
        .send({ user: userData, rescue: rescueData })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Rescue and user created successfully')
    })

    it('should return 400 if email is missing or invalid', async () => {
      const response = await request(app)
        .post('/api/rescue/create-rescue')
        .send({ user: { ...userData, email: '' }, rescue: rescueData })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'Email is required and must be a string',
      )
    })

    it('should return 500 if service throws an error', async () => {
      ;(createUser as jest.Mock).mockRejectedValue(new Error('Service error'))

      const response = await request(app)
        .post('/api/rescue/create-rescue')
        .send({ user: userData, rescue: rescueData })

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Error creating rescue account')
      expect(response.body.error).toBe('Service error')
    })
  })

  describe('verifyEmail', () => {
    app.get('/api/verify-email', verifyEmail)

    it('should return 200 and success message on successful verification', async () => {
      const mockUser = { user_id: 1, email_verified: true }
      ;(verifyEmailToken as jest.Mock).mockResolvedValue(mockUser)

      const response = await request(app)
        .get('/api/verify-email')
        .query({ token: 'valid-token' })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Email verified successfully!')
      expect(response.body.user_id).toBe(1)
    })

    it('should return 400 if token is missing', async () => {
      const response = await request(app).get('/api/verify-email').query({})

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Verification token is required')
    })

    it('should return 400 if verification fails', async () => {
      ;(verifyEmailToken as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired verification token'),
      )

      const response = await request(app)
        .get('/api/verify-email')
        .query({ token: 'invalid-token' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'Invalid or expired verification token',
      )
    })
  })
})
