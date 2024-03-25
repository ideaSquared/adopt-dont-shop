// services/emailService.js
import nodemailer from 'nodemailer';

/**
 * Asynchronously sends a password reset email to a user.
 *
 * This function configures a transporter object using SMTP server details and authentication credentials
 * from environment variables. It then uses this transporter to send an email to the specified email address,
 * containing a link for the user to reset their password. The function encapsulates the setup of the nodemailer
 * transporter and the sending of the email in a straightforward and reusable manner.
 *
 * @param {string} email - The email address of the recipient who has requested a password reset.
 * @param {string} resetURL - The URL the user must visit to proceed with resetting their password. This URL
 * typically contains a token or identifier that validates the password reset request and allows the user to
 * specify a new password securely.
 *
 * @returns {Promise<nodemailer.SentMessageInfo>} A Promise that resolves with information about the sent
 * message, such as the result of the SMTP transaction. The structure of this information depends on the
 * nodemailer transport mechanism and the SMTP server's response.
 *
 * Usage of environment variables for SMTP server details and credentials (VITE_MAIL_HOST, VITE_MAIL_PORT,
 * VITE_MAIL_USER, VITE_MAIL_PASS) allows for configuration flexibility and security, as these values are
 * not hardcoded into the application code. It's important to ensure these environment variables are set
 * correctly in the application's runtime environment.
 */

export const sendPasswordResetEmail = async (email, resetURL) => {
	const transporter = nodemailer.createTransport({
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS,
		},
	});

	const mailOptions = {
		from: 'help@adontdontshop.app',
		to: email,
		subject: 'Reset Your Password',
		html: `<p>You requested a password reset. Click <a href="${resetURL}">here</a> to reset your password.</p>`,
	};
	return transporter.sendMail(mailOptions);
};
