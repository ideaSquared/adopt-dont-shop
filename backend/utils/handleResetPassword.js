import { generateResetToken } from './tokenGenerator.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import LoggerUtil from '../utils/Logger.js';
import { pool } from '../dbConnection.js';

async function handlePasswordReset(user) {
	const logger = new LoggerUtil('auth-service').getLogger();
	const email = user.email;
	const token = await generateResetToken();

	// Calculate expiration time for the reset token
	const resetTokenExpiration = new Date(); // Get the current date and time
	resetTokenExpiration.setHours(resetTokenExpiration.getHours() + 1); // Add one hour to the current time

	// Format the timestamp to be compatible with PostgreSQL 'timestamp without time zone'
	const formattedTimestamp = resetTokenExpiration
		.toISOString()
		.replace('T', ' ')
		.slice(0, 19);

	// SQL to update the user with the reset token and its expiration
	const updateQuery = `
        UPDATE users
        SET reset_token = $1, reset_token_expiration = $2
        WHERE email = $3
        RETURNING email; 
    `;

	try {
		// Perform the update in the database
		const result = await pool.query(updateQuery, [
			token,
			formattedTimestamp,
			email,
		]);

		if (result.rows.length === 0) {
			logger.error(`No user found with email: ${email}`);
			throw new Error(`No user found with email: ${email}`);
		}

		// Construct the reset URL with the token
		const FRONTEND_BASE_URL =
			process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
		const resetURL = `${FRONTEND_BASE_URL}/reset-password?token=${token}`;

		// Send the password reset email
		await sendPasswordResetEmail(email, resetURL);
		logger.info(`Password reset email sent to: ${email}`);
	} catch (error) {
		logger.error(`Failed to reset password for ${email}: ${error.message}`);
		throw error; // Re-throw the error to be handled by the caller
	}
}

export default handlePasswordReset;
