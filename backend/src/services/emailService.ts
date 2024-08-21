import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import { AuditLogger } from './auditLogService'
dotenv.config()

// Create a reusable transporter object using the default SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  })
}

// Function to send an email
const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: '"AdoptDontShop Support" <support@adoptdontshop.com>',
      to,
      subject,
      text,
      html,
    }

    const info = await transporter.sendMail(mailOptions)

    // Audit log for successful email sending
    await AuditLogger.logAction(
      'EmailService',
      `Email sent successfully to ${to} with subject: "${subject}"`,
      'INFO',
      to,
    )

    // Uncomment if you want to log details in the console
    // console.log('Message sent: %s', info.messageId);
    // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    if (error instanceof Error) {
      // Audit log for email sending failure
      await AuditLogger.logAction(
        'EmailService',
        `Failed to send email to ${to} with subject: "${subject}". Error: ${error.message}`,
        'ERROR',
        to,
      )
    } else {
      await AuditLogger.logAction(
        'EmailService',
        `Unknown error occurred while sending email to ${to} with subject: "${subject}"`,
        'ERROR',
        to,
      )
    }
    throw error
  }
}

// Function to generate the password reset email
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
) => {
  const resetUrl = `http://${process.env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`

  const text = `You requested a password reset. Please use the following link to reset your password: ${resetUrl}`
  const html = `<p>You requested a password reset. Please use the following link to reset your password:</p>
                <p><a href="${resetUrl}">Reset Password</a></p>`

  await sendEmail(email, 'Password Reset', text, html)

  // Audit log for sending a password reset email
  await AuditLogger.logAction(
    'EmailService',
    `Password reset email sent to ${email}`,
    'INFO',
    email,
  )
}

// Function to generate the email verification email
export const sendVerificationEmail = async (
  email: string,
  verificationToken: string,
) => {
  const verificationUrl = `http://${process.env.FRONTEND_BASE_URL}/verify-email?token=${verificationToken}`

  const text = `Thank you for registering. Please verify your email by clicking the link below: ${verificationUrl}`
  const html = `<p>Thank you for registering. Please verify your email by clicking the link below:</p>
                <p><a href="${verificationUrl}">Verify Email</a></p>`

  await sendEmail(email, 'Please Verify Your Email', text, html)

  // Audit log for sending a verification email
  await AuditLogger.logAction(
    'EmailService',
    `Verification email sent to ${email}`,
    'INFO',
    email,
  )
}
