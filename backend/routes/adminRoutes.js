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
import { validateRequest } from '../middleware/joiValidateSchema.js'; // For validating request bodies against Joi schemas.

import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';
import { generateObjectId } from '../utils/generateObjectId.js';
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
	async (req, res) => {
		try {
			// Assuming this is where you check if the user exists and set the resetTokenForceFlag
			const user = await User.findOne({ _id: req.params.id }); // Find the user by ID

			if (!user) {
				// If the user doesn't exist, respond with a 404 error.
				return res.status(404).json({ message: 'User not found.' });
			}

			// Assuming this is where you set the resetTokenForceFlag for the user
			user.resetTokenForceFlag = true; // Set the flag to true
			await user.save(); // Save the user document with the updated flag

			// Respond to confirm the forced password reset flag has been set.
			logger.info(
				`Reset Password: Forced password reset flag for user with ID ${req.params.id} set to true successfully.`
			);
			res.json({
				message: 'Password reset required.',
			});
		} catch (err) {
			// Log and respond with an error if setting the forced password reset flag fails.
			Sentry.captureException(err); // Log the error to Sentry
			logger.error(
				`Reset Password: Failed to set forced password reset flag for user with ID ${req.params.id}. Error: ${err.message}`
			);
			res.status(500).json({ message: 'Failed to enforce password reset.' });
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

router.delete(
	'/conversations/:id', // :id is a route parameter that allows us to capture the ID of the conversation to delete
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const id = req.params.id; // Extract the ID from the request parameters
			const result = await Conversation.findByIdAndDelete(id); // Use Mongoose's findByIdAndDelete method to remove the conversation

			if (result) {
				logger.info(`Deleted conversation with ID: ${id}`);
				res.json({ message: 'Conversation deleted successfully' });
			} else {
				logger.warn(`Conversation with ID: ${id} not found`);
				res.status(404).json({ message: 'Conversation not found' });
			}
		} catch (error) {
			logger.error(`Error deleting conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

router.get('/rescues', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const rescues = await Rescue.aggregate([
			{
				$lookup: {
					from: 'users',
					localField: 'staff.userId',
					foreignField: '_id',
					as: 'staffDetails',
				},
			},
			{
				$project: {
					_id: 1,
					rescueName: 1,
					rescueType: 1,
					staff: {
						$map: {
							input: '$staff',
							as: 'staffItem',
							in: {
								$mergeObjects: [
									'$$staffItem',
									{
										userDetails: {
											$arrayElemAt: [
												{
													$filter: {
														input: '$staffDetails',
														as: 'detail',
														cond: {
															$eq: ['$$detail._id', '$$staffItem.userId'],
														},
													},
												},
												0,
											],
										},
									},
								],
							},
						},
					},
				},
			},
		]);

		// No need for an additional map to handle the userDetails since it's now handled within the aggregation pipeline.
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

router.get('/rescues/:id', authenticateToken, checkAdmin, async (req, res) => {
	const { id } = req.params;

	try {
		const rescue = await Rescue.aggregate([
			{
				$match: {
					_id: generateObjectId(id), // Ensure to match the specific document by its ID
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'staff.userId',
					foreignField: '_id',
					as: 'staffDetails',
				},
			},
			{
				$project: {
					_id: 1,
					rescueName: 1,
					rescueType: 1,
					staff: {
						$map: {
							input: '$staff',
							as: 'staffItem',
							in: {
								$mergeObjects: [
									'$$staffItem',
									{
										userDetails: {
											$arrayElemAt: [
												{
													$filter: {
														input: '$staffDetails',
														as: 'detail',
														cond: {
															$eq: ['$$detail._id', '$$staffItem.userId'],
														},
													},
												},
												0,
											],
										},
									},
								],
							},
						},
					},
				},
			},
		]);

		if (rescue.length === 0) {
			return res.status(404).send({
				message: 'Rescue not found',
			});
		}

		logger.info(`Rescue fetched successfully for ${rescue[0].rescueName}.`);
		res.json(rescue[0]); // Since findById is expected to return a single document
	} catch (error) {
		Sentry.captureException(error);
		logger.error('Failed to fetch rescue: ' + error.message);
		res.status(500).send({
			message: 'Failed to fetch rescue',
			error: error.message,
		});
	}
});

router.delete(
	'/rescues/:id', // :id is a route parameter that allows us to capture the ID of the rescue to delete
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const id = req.params.id; // Extract the ID from the request parameters
			const result = await Rescue.findByIdAndDelete(id); // Use Mongoose's findByIdAndDelete method to remove the rescue

			if (result) {
				logger.info(`Deleted rescue with ID: ${id}`);
				res.json({ message: 'Rescue deleted successfully' });
			} else {
				logger.warn(`Rescue with ID: ${id} not found`);
				res.status(404).json({ message: 'Rescue not found' });
			}
		} catch (error) {
			logger.error(`Error deleting rescue: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

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

router.get('/pets/:id', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		logger.info(`Fetching pet with ID: ${id}`);
		const pet = await Pet.findById(id);
		if (!pet) {
			logger.warn(`Pet not found with ID: ${id}`);
			return res.status(404).send({ message: 'Pet not found' });
		}
		logger.info(`Successfully fetched pet with ID: ${id}`);
		res.json(pet);
	} catch (error) {
		logger.error(
			`Failed to fetch pet with ID: ${req.params.id}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch pet',
			error: error.message,
		});
	}
});

router.delete(
	'/pets/:id', // :id is a route parameter for capturing the ID of the pet to delete
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const id = req.params.id; // Extract the ID from the request parameters
			const result = await Pet.findByIdAndDelete(id); // Use Mongoose's findByIdAndDelete method to remove the pet

			if (result) {
				logger.info(`Deleted pet with ID: ${id}`);
				res.json({ message: 'Pet deleted successfully' });
			} else {
				logger.warn(`Pet with ID: ${id} not found`);
				res.status(404).json({ message: 'Pet not found' });
			}
		} catch (error) {
			logger.error(`Error deleting pet: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

router.delete(
	'/rescues/:rescueId/staff/:staffId',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		const { rescueId, staffId } = req.params;

		try {
			// Find the rescue organization from which to delete the staff member
			const rescue = await Rescue.findById(rescueId);
			if (!rescue) {
				logger.warn(`Rescue with ID ${rescueId} not found.`);
				return res.status(404).send({ message: 'Rescue not found.' });
			}

			// Check if the staff member exists within the rescue organization
			const staffIndex = rescue.staff.findIndex(
				(member) => member.userId.toString() === staffId
			);
			if (staffIndex === -1) {
				logger.warn(
					`Staff member with ID ${staffId} not found in rescue ${rescueId}.`
				);
				return res.status(404).send({ message: 'Staff member not found.' });
			}

			// Remove the staff member from the rescue organization
			rescue.staff.splice(staffIndex, 1);
			await rescue.save();

			logger.info(
				`Staff member with ID ${staffId} deleted from rescue ${rescueId} successfully.`
			);
			res.send({ message: 'Staff member deleted successfully.' });
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Failed to delete staff member with ID ${staffId} from rescue ${rescueId}: ${error.message}`
			);
			res.status(500).send({
				message: 'Failed to delete staff member.',
				error: error.message,
			});
		}
	}
);

// Export the router to make these routes available to the rest of the application.
export default router;
