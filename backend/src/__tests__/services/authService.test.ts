import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../../Models'
import { AuditLogger } from '../../services/auditLogService'
import {
  changePassword,
  forgotPassword,
  loginUser,
  resetPassword,
  updateUserDetails,
  verifyEmailToken,
} from '../../services/authService'
import { sendPasswordResetEmail } from '../../services/emailService'
import { getRolesForUser } from '../../services/permissionService'
import { generateUUID } from '../../utils/generateUUID'

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('../../Models/')
jest.mock('../../services/emailService')
jest.mock('../../services/permissionService')
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))
jest.mock('../../utils/generateUUID', () => ({
  generateUUID: jest.fn(),
}))

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loginUser', () => {
    it('should login the user and return a token and user data', async () => {
      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        toJSON: jest
          .fn()
          .mockReturnValue({ user_id: 1, email: 'test@example.com' }),
      }
      const mockRoles = ['user']

      ;(User.scope as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(getRolesForUser as jest.Mock).mockResolvedValue(mockRoles)
      ;(jwt.sign as jest.Mock).mockReturnValue('mocked-token')

      process.env.SECRET_KEY = 'secret-key'

      const result = await loginUser('test@example.com', 'password')

      expect(result).toEqual({
        token: 'mocked-token',
        user: { user_id: 1, email: 'test@example.com', roles: mockRoles },
      })

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'User logged in with email: test@example.com',
        'INFO',
        1,
      )
    })

    it('should throw an error if the user is not found', async () => {
      ;(User.scope as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      })

      await expect(loginUser('test@example.com', 'password')).rejects.toThrow(
        'Invalid email or password',
      )

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Failed login attempt for email: test@example.com',
        'WARNING',
      )
    })

    it('should throw an error if the password is invalid', async () => {
      const mockUser = { password: 'hashed-password' }

      ;(User.scope as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(loginUser('test@example.com', 'password')).rejects.toThrow(
        'Invalid email or password',
      )

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Failed login attempt for email: test@example.com',
        'WARNING',
        undefined,
      )
    })
  })

  describe('updateUserDetails', () => {
    it('should update the user details', async () => {
      const mockUser = { update: jest.fn().mockResolvedValue(true) }
      ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

      const result = await updateUserDetails('1', {
        email: 'newemail@example.com',
      })

      expect(User.findByPk).toHaveBeenCalledWith('1')
      expect(mockUser.update).toHaveBeenCalledWith({
        email: 'newemail@example.com',
      })
      expect(result).toEqual(mockUser)

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'UserService',
        'Updated user details for user: 1',
        'INFO',
        '1',
      )
    })

    it('should throw an error if the user is not found', async () => {
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)

      await expect(
        updateUserDetails('1', { email: 'newemail@example.com' }),
      ).rejects.toThrow('User not found')

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'UserService',
        'Attempted to update non-existent user: 1',
        'WARNING',
        '1',
      )
    })
  })

  describe('changePassword', () => {
    it("should change the user's password", async () => {
      const mockUser = { password: 'old-hashed-password', save: jest.fn() }
      ;(User.scope as jest.Mock).mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(mockUser),
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')

      const result = await changePassword('1', 'old-password', 'new-password')

      expect(mockUser.password).toBe('new-hashed-password')
      expect(mockUser.save).toHaveBeenCalled()
      expect(result).toBe(true)

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'UserService',
        'Password changed for user: 1',
        'INFO',
        '1',
      )
    })

    it('should throw an error if the current password is incorrect', async () => {
      const mockUser = { password: 'old-hashed-password' }
      ;(User.scope as jest.Mock).mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(mockUser),
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        changePassword('1', 'wrong-password', 'new-password'),
      ).rejects.toThrow('Current password is incorrect')

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'UserService',
        'Incorrect current password attempt for user: 1',
        'WARNING',
        '1',
      )
    })

    it('should throw an error if the user is not found', async () => {
      ;(User.scope as jest.Mock).mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(null),
      })

      await expect(
        changePassword('1', 'old-password', 'new-password'),
      ).rejects.toThrow('User not found')

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'UserService',
        'Attempted to change password for non-existent user: 1',
        'WARNING',
        '1',
      )
    })
  })

  describe('forgotPassword', () => {
    it('should generate a reset token and send a password reset email', async () => {
      const mockUser = {
        save: jest.fn(),
        email: 'test@example.com',
        reset_token: '',
        reset_token_expiration: new Date(),
      }
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
      ;(generateUUID as jest.Mock).mockReturnValue('reset-token')

      const result = await forgotPassword('test@example.com')

      expect(mockUser.reset_token).toBe('reset-token')
      expect(mockUser.save).toHaveBeenCalled()
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token',
      )
      expect(result).toBe(true)

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Password reset email sent to: test@example.com',
        'INFO',
        undefined,
      )
    })

    it('should return false if the user is not found', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const result = await forgotPassword('test@example.com')

      expect(result).toBe(false)

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Password reset requested for non-existent email: test@example.com',
        'WARNING',
      )
    })
  })

  describe('resetPassword', () => {
    it("should reset the user's password", async () => {
      const mockUser = {
        save: jest.fn(),
        user_id: '1', // This is being used in the logAction call
        password: '',
        reset_token: '',
        reset_token_expiration: new Date(),
      }
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')

      const result = await resetPassword('reset-token', 'new-password')

      expect(mockUser.password).toBe('new-hashed-password')
      expect(mockUser.reset_token).toBeNull()
      expect(mockUser.reset_token_expiration).toBeNull()
      expect(mockUser.save).toHaveBeenCalled()
      expect(result).toBe(true)

      // Adjust the expectation to match the actual logAction call
      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        `Password reset successfully for user: ${mockUser.user_id}`,
        'INFO',
        '1', // Updated to match the actual user_id passed in the logAction
      )
    })

    it('should return false if the reset token is invalid or expired', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const result = await resetPassword('invalid-token', 'new-password')

      expect(result).toBe(false)

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Invalid or expired password reset token used: invalid-token',
        'WARNING',
      )
    })
  })

  describe('verifyEmailToken', () => {
    it('should verify the email token and return the user', async () => {
      const mockUser = {
        save: jest.fn(),
        email_verified: false,
        verification_token: 'token',
      }
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

      const result = await verifyEmailToken('token')

      expect(mockUser.email_verified).toBe(true)
      expect(mockUser.verification_token).toBeNull()
      expect(mockUser.save).toHaveBeenCalled()
      expect(result).toEqual(mockUser)

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Email verified for user: undefined',
        'INFO',
        undefined,
      )
    })

    it('should throw an error if the token is invalid or expired', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      await expect(verifyEmailToken('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token',
      )

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'AuthService',
        'Invalid or expired email verification token: invalid-token',
        'WARNING',
      )
    })
  })
})
