import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
dotenv.config()

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
) => {
  // Create a transporter object
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  })

  // Construct the email
  const mailOptions = {
    from: '"AdoptDontShop Support" <support@adoptdontshop.com>',
    to: email,
    subject: 'Password Reset',
    text: `You requested a password reset. Please use the following link to reset your password: http://${process.env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`,
    html: `<p>You requested a password reset. Please use the following link to reset your password:</p>
           <p><a href="http://${process.env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}">Reset Password</a></p>`,
  }

  // Send the email
  const info = await transporter.sendMail(mailOptions)

  // Preview the email URL in your console
  console.log('Message sent: %s', info.messageId)
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
}
