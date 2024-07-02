import nodemailer from 'nodemailer';

export const emailService = {
	/**
	 * Generic function to send emails.
	 *
	 * @param {string} to Recipient's email address.
	 * @param {string} subject Subject line of the email.
	 * @param {string} html HTML content of the email body.
	 * @returns {Promise<any>} A promise that resolves with the email sending result.
	 */
	async sendEmail(to, subject, html) {
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

		try {
			// Attempt to send the email with the configured transporter and mail options
			const info = await transporter.sendMail(mailOptions);
			console.log('Email sent: %s', info.messageId); // Log the messageId of the sent email for tracking
			return info;
		} catch (error) {
			// Log detailed error information if the email fails to send
			console.error('Error sending email:', error);
			if (error.response) {
				console.error('SMTP response:', error.response);
			}
			return null; // Return null to indicate failure
		}
	},

	/**
	 * Sends a password reset email to the user.
	 *
	 * @param {string} email Recipient's email address.
	 * @param {string} resetURL URL for the password reset page.
	 * @returns {Promise<any>}
	 */
	async sendPasswordResetEmail(email, resetURL) {
		const subject = 'Reset Your Password';
		const html = `<!DOCTYPE html>
					<html>
					<head>
					<title>Reset Your Password</title>
					<style>
					body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; }
					.container { width: 100%; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; }
					.button { background-color: #007bff; color: white; padding: 10px 20px; text-align: center; display: inline-block; text-decoration: none; }
					</style>
					</head>
					<body>
					<div class="container">
					<h2>Reset Your Password</h2>
					<p>You requested a password reset. Please click the button below to set a new password.</p>
					<a href="${resetURL}" class="button">Reset Password</a>
					</div>
					</body>
					</html>
					`;
		return this.sendEmail(email, subject, html);
	},

	/**
	 * Sends an email verification link to the user.
	 *
	 * @param {string} email Recipient's email address.
	 * @param {string} verificationURL URL for the email verification page.
	 * @returns {Promise<any>}
	 */
	async sendEmailVerificationEmail(email, verificationURL) {
		const subject = 'Welcome to Adopt Dont Shop!';
		const html = `<!DOCTYPE html>
						<html>
						<head>
						<title>Verify Your Email</title>
						<style>
						body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; }
						.container { width: 100%; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; }
						.button { background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; display: inline-block; text-decoration: none; }
						</style>
						</head>
						<body>
						<div class="container">
						<h2>Welcome to Adopt Dont Shop</h2>
						<h4>Please verify your email address</h4>
						<p>Welcome! Please confirm your email address by clicking the button below.</p>
						<a href="${verificationURL}" class="button">Verify Email</a>
						</div>
						</body>
						</html>
						`;
		return this.sendEmail(email, subject, html);
	},

	/**
	 * Sends an email to a user whose account was created by an admin or rescue organization.
	 *
	 * @param {string} email Recipient's email address.
	 * @param {string} loginURL URL for the login page.
	 * @param {string} temporaryPassword A temporary password, if applicable.
	 * @returns {Promise<any>}
	 */
	async sendAccountCreationEmail(email, loginURL, temporaryPassword = '') {
		const subject = 'Your Account Has Been Created';
		const html = `<!DOCTYPE html>
					<html>
					<head>
					<title>Welcome to Adopt Don't Shop</title>
					<style>
					body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; }
					.container { width: 100%; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; }
					.button { background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; display: inline-block; text-decoration: none; }
					</style>
					</head>
					<body>
					<div class="container">
					<h2>Your Account Has Been Created</h2>
					<p>An account has been created for you on Adopt Don't Shop by an admin or rescue organization.</p>
					<p>Please login and set your password</p>
					<a href="${loginURL}" class="button">Login Now</a>
					</div>
					</body>
					</html>
					`;
		return this.sendEmail(email, subject, html);
	},

	/**
	 * Sends an email to notify a user that a rescue has added them as staff.
	 *
	 * @param {string} email Recipient's email address.
	 * @param {string} loginURL URL for the login page.
	 * @returns {Promise<any>}
	 */
	async sendStaffAdditionEmail(email, loginURL, rescueName) {
		const subject = 'You Have Been Added as Staff';
		const html = `<!DOCTYPE html>
			<html>
			<head>
			<title>Staff Addition Notification</title>
			<style>
				body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; }
				.container { width: 100%; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px; }
				.button { background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; display: inline-block; text-decoration: none; }
			</style>
			</head>
			<body>
			<div class="container">
				<h2>You Have Been Added as Staff to ${rescueName}</h2>
				<p>A rescue has added you as staff. Please go to the website and login. If they have made an account for you, please follow the instructions to reset your password.</p>
				<a href="${loginURL}" class="button">Login Now</a>
			</div>
			</body>
			</html>`;
		return this.sendEmail(email, subject, html);
	},
};

// Optionally export default if this is the only module being exported from the file
// export default emailService;
