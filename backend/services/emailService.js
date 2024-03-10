// services/emailService.js
import nodemailer from 'nodemailer';

export const sendPasswordResetEmail = async (email, resetURL) => {
	const transporter = nodemailer.createTransport({
		host: process.env.VITE_MAIL_HOST,
		port: process.env.VITE_MAIL_PORT,
		auth: {
			user: process.env.VITE_MAIL_USER,
			pass: process.env.VITE_MAIL_PASS,
		},
	});

	const mailOptions = {
		from: 'your_email@example.com',
		to: email,
		subject: 'Reset Your Password',
		html: `<p>You requested a password reset. Click <a href="${resetURL}">here</a> to reset your password.</p>`,
	};
	return transporter.sendMail(mailOptions);
};
