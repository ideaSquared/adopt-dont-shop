import { generateResetToken } from './tokenGenerator.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import LoggerUtil from '../utils/Logger.js';

async function handlePasswordReset(user) {
	const logger = new LoggerUtil('auth-service').getLogger();
	const email = user.email;
	const token = await generateResetToken();
	user.resetToken = token;
	user.resetTokenExpiration = Date.now() + 3600000; // 1 hour from now

	await user.save();

	const FRONTEND_BASE_URL =
		process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
	const resetURL = `${FRONTEND_BASE_URL}/reset-password?token=${token}`;

	await sendPasswordResetEmail(email, resetURL);
	logger.info(`Password reset email sent to: ${email}`);
}

export default handlePasswordReset;
