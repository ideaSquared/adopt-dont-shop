// Import the nodemailer package to enable email sending capabilities
import nodemailer from 'nodemailer';

/**
 * Generic function to send emails.
 *
 * @param {string} to Recipient's email address.
 * @param {string} subject Subject line of the email.
 * @param {string} html HTML content of the email body.
 * @returns {Promise<nodemailer.SentMessageInfo>} A promise that resolves with the email sending result.
 */
const sendEmail = async (to, subject, html) => {
	// Configure the transporter using SMTP details from environment variables
	const transporter = nodemailer.createTransport({
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS,
		},
	});

	// Define the email options including from, to, subject, and body
	const mailOptions = {
		from: 'no-reply@adoptdontshop.app', // This could be a parameter if different emails have different senders
		to: to,
		subject: subject,
		html: html,
	};

	// Send the email with the configured transporter and mail options
	return transporter.sendMail(mailOptions);
};

/**
 * Sends a password reset email to the user.
 *
 * @param {string} email Recipient's email address.
 * @param {string} resetURL URL for the password reset page.
 * @returns {Promise<nodemailer.SentMessageInfo>}
 */
export const sendPasswordResetEmail = async (email, resetURL) => {
	const subject = 'Reset Your Password';
	const html = `<p>You requested a password reset. Click <a href="${resetURL}">here</a> to reset your password.</p>`;
	// Use the generic sendEmail function
	return sendEmail(email, subject, html);
};

/**
 * Sends an email verification link to the user.
 *
 * @param {string} email Recipient's email address.
 * @param {string} verificationURL URL for the email verification page.
 * @returns {Promise<nodemailer.SentMessageInfo>}
 */
export const sendEmailVerificationEmail = async (email, verificationURL) => {
	const subject = 'Verify Your Email Address';
	const html = `<p>Welcome! Please confirm your email address by clicking <a href="${verificationURL}">here</a>.</p>`;
	// Use the generic sendEmail function
	return sendEmail(email, subject, html);
};

/**
 * Sends an email to a user whose account was created by an admin or rescue organization.
 *
 * @param {string} email Recipient's email address.
 * @param {string} loginURL URL for the login page.
 * @param {string} [temporaryPassword=''] A temporary password, if applicable.
 * @returns {Promise<nodemailer.SentMessageInfo>}
 */
export const sendAccountCreationEmail = async (
	email,
	loginURL,
	temporaryPassword = ''
) => {
	const subject = 'Your Account Has Been Created';
	const html = `<p>An account has been created for you on Adopt Don't Shop by an admin or rescue organization.</p>
                  <p>${
										temporaryPassword
											? `Your temporary password is: <strong>${temporaryPassword}</strong>`
											: ''
									}</p>
                  <p>Please click <a href="${loginURL}">here</a> to login and ${
		temporaryPassword ? 'change your password.' : 'access your account.'
	}</p>`;
	// Use the generic sendEmail function
	return sendEmail(email, subject, html);
};
