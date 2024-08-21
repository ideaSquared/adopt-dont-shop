import nodemailer from 'nodemailer'
import { AuditLogger } from '../../services/auditLogService'
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../../services/emailService'

jest.mock('nodemailer')
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))

// Mock environment variables
process.env.MAIL_HOST = 'smtp.test.com'
process.env.MAIL_PORT = '587'
process.env.MAIL_USER = 'testuser'
process.env.MAIL_PASS = 'testpass'
process.env.FRONTEND_BASE_URL = 'localhost:3001'

describe('Email Service', () => {
  let mockSendMail: jest.Mock

  beforeAll(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'testMessageId' })
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendPasswordResetEmail', () => {
    it('should send a password reset email with the correct content and log the action', async () => {
      const email = 'user@test.com'
      const resetToken = 'reset-token'

      await sendPasswordResetEmail(email, resetToken)

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false, // because MAIL_PORT is not 465
        auth: {
          user: 'testuser',
          pass: 'testpass',
        },
      })

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"AdoptDontShop Support" <support@adoptdontshop.com>',
        to: 'user@test.com',
        subject: 'Password Reset',
        text: `You requested a password reset. Please use the following link to reset your password: http://localhost:3001/reset-password?token=reset-token`,
        html: `<p>You requested a password reset. Please use the following link to reset your password:</p>
                <p><a href="http://localhost:3001/reset-password?token=reset-token">Reset Password</a></p>`,
      })

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'EmailService',
        'Email sent successfully to user@test.com with subject: "Password Reset"',
        'INFO',
        'user@test.com',
      )

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'EmailService',
        'Password reset email sent to user@test.com',
        'INFO',
        'user@test.com',
      )
    })
  })

  describe('sendVerificationEmail', () => {
    it('should send a verification email with the correct content and log the action', async () => {
      const email = 'user@test.com'
      const verificationToken = 'verification-token'

      await sendVerificationEmail(email, verificationToken)

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false, // because MAIL_PORT is not 465
        auth: {
          user: 'testuser',
          pass: 'testpass',
        },
      })

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"AdoptDontShop Support" <support@adoptdontshop.com>',
        to: 'user@test.com',
        subject: 'Please Verify Your Email',
        text: `Thank you for registering. Please verify your email by clicking the link below: http://localhost:3001/verify-email?token=verification-token`,
        html: `<p>Thank you for registering. Please verify your email by clicking the link below:</p>
                <p><a href="http://localhost:3001/verify-email?token=verification-token">Verify Email</a></p>`,
      })

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'EmailService',
        'Email sent successfully to user@test.com with subject: "Please Verify Your Email"',
        'INFO',
        'user@test.com',
      )

      expect(AuditLogger.logAction).toHaveBeenCalledWith(
        'EmailService',
        'Verification email sent to user@test.com',
        'INFO',
        'user@test.com',
      )
    })
  })
})
