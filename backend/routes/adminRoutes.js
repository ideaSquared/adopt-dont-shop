// Import necessary modules from the express framework and other utilities.
import express from 'express';
import bcrypt from 'bcryptjs'; // For hashing passwords.
import User from '../models/User.js'; // Import the User model for database operations.
import Conversation from '../models/Conversation.js';
import Rescue from '../models/Rescue.js';
import Pet from '../models/Pet.js';
import authenticateToken from '../middleware/authenticateToken.js'; // Middleware to check if the request is authenticated.
import checkAdmin from '../middleware/checkAdmin.js'; // Middleware to check if the authenticated user is an admin.
import nodemailer from 'nodemailer'; // Imported but not used in this snippet. Potentially for sending emails (e.g., password reset instructions).
import {
	validateRequest,
	adminResetPasswordSchema,
} from '../middleware/joiValidateSchema.js'; // For validating request bodies against Joi schemas.

import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';
const logger = new LoggerUtil('admin-service').getLogger();

// Initialize a new router instance from Express to define admin-specific routes.
const router = express.Router();

/**
 * Route handler for fetching all users from the database.
 * Requires both authentication and verification of admin status before proceeding.
 * On success, returns a list of all users in the system.
 * On failure, logs the error and returns a message indicating the failure to fetch users.
 */
router.get('/users', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const users = await User.find({});
		res.json(users);
		logger.info('Fetched all users successfully');
	} catch (err) {
		Sentry.captureException(err);
		logger.error('An error occurred while fetching users: %s', err.message);
		res
			.status(500)
			.json({ message: 'An error occurred while fetching users.' });
	}
});

/**
 * Route handler for deleting a specific user by their ID.
 * Requires authentication and admin status to ensure only authorized users can perform this action.
 * It extracts the user ID from the request parameters, attempts to delete the user, and returns a confirmation message upon success.
 * If the specified user cannot be found or if there's an error during the deletion process, it responds with an appropriate error message.
 */
router.delete(
	'/users/delete/:id',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			// Extract the user ID from the request parameters.
			const { id } = req.params;
			// Attempt to delete the user by their ID.
			const deletedUser = await User.findByIdAndDelete(id);
			if (!deletedUser) {
				// Respond with a 404 error if the user is not found.
				logger.info(`Delete User: User with ID ${id} not found.`);
				return res.status(404).json({ message: 'User not found.' });
			}
			// Respond to confirm the user has been deleted.
			logger.info(`Delete User: User with ID ${id} deleted successfully.`);
			res.json({ message: 'User deleted successfully.' });
		} catch (err) {
			// Log and respond with an error if deletion fails.
			Sentry.captureException(err); // Log the error to Sentry
			logger.error(
				`Delete User: Failed to delete user with ID ${req.params.id}. Error: ${err.message}`
			);
			res.status(500).json({ message: 'Failed to delete user.' });
		}
	}
);

/**
 * Route handler for resetting a user's password by their ID.
 * This action requires the requester to be authenticated and have admin privileges, ensuring secure management of user credentials.
 * The request is validated against the adminResetPasswordSchema to ensure the new password meets specified criteria.
 * It hashes the new password before updating the user's record in the database, returning a success message upon completion.
 * In case the specified user is not found or if there's an error during the update process, it responds with an error message.
 */
router.post(
	'/users/reset-password/:id',
	authenticateToken,
	checkAdmin,
	validateRequest(adminResetPasswordSchema),
	async (req, res) => {
		try {
			// Extract the user ID and new password from the request.
			const { id } = req.params;
			const { password } = req.body;

			// Hash the new password before saving it.
			const hashedPassword = await bcrypt.hash(password, 12);

			// Attempt to update the user's password in the database.
			const updatedUser = await User.findByIdAndUpdate(
				id,
				{ password: hashedPassword },
				{ new: true } // Return the updated document.
			);

			if (!updatedUser) {
				// Respond with a 404 error if the user is not found.
				return res.status(404).json({ message: 'User not found.' });
			}
			// Respond to confirm the password has been reset.
			logger.info(
				`Reset Password: Password for user with ID ${id} reset successfully.`
			);
			res.json({ message: 'Password reset successfully.' });
		} catch (err) {
			// Log and respond with an error if the password reset fails.
			Sentry.captureException(err); // Log the error to Sentry
			logger.error(
				`Reset Password: Failed to reset password for user with ID ${req.params.id}. Error: ${err.message}`
			);
			res.status(500).json({ message: 'Failed to reset password.' });
		}
	}
);

// Get all conversations for a user
router.get(
	'/conversations',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const conversations = await Conversation.find({});
			logger.info('Fetched all conversations for user');
			res.json(conversations);
		} catch (error) {
			logger.error(`Error fetching conversations: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

router.get('/rescues', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const rescues = await Rescue.find({});
		logger.info('All rescues fetched successfully.');
		res.json(rescues);
	} catch (error) {
		Sentry.captureException(error);
		logger.error('Failed to fetch rescues: ' + error.message);
		res.status(500).send({
			message: 'Failed to fetch rescues',
			error: error.message,
		});
	}
});

// Get all pet records
router.get('/pets', authenticateToken, checkAdmin, async (req, res) => {
	try {
		logger.info('Fetching all pets');
		const pets = await Pet.find({});
		logger.info(`Successfully fetched all pets. Count: ${pets.length}`);
		res.json(pets);
	} catch (error) {
		logger.error(`Failed to fetch pets: ${error.message}`, { error });
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch pets',
			error: error.message,
		});
	}
});

// Export the router to make these routes available to the rest of the application.
export default router;
