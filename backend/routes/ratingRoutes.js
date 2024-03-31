import express from 'express';
import Rating from '../models/Rating.js'; // Assuming your Rating model is in the models directory
import Pet from '../models/Pet.js';
import User from '../models/User.js';
import authenticateToken from '../middleware/authenticateToken.js';
import {
	validateRequest,
	ratingSchema,
} from '../middleware/joiValidateSchema.js'; // Assuming you have a validation schema for ratings
import Sentry from '@sentry/node';
import LoggerUtil from '../utils/Logger.js';

const logger = new LoggerUtil('rating-service').getLogger();
const router = express.Router();

// Create a new rating
router.post(
	'/',
	authenticateToken,
	validateRequest(ratingSchema),
	async (req, res) => {
		try {
			const userId = req.user.userId; // Assuming user ID is attached to the request by the authentication middleware
			const { targetType, targetId } = req.body;

			// Determine which model to use based on the targetType
			let TargetModel;

			console.log(req.body);

			switch (targetType) {
				case 'Pet':
					TargetModel = Pet; // Assuming Pet model is imported
					break;
				case 'User':
					TargetModel = User; // Assuming User model is imported
					break;
				default:
					return res.status(400).send({ message: 'Invalid target type' });
			}

			// Check if the target entity exists
			const targetExists = await TargetModel.exists({ _id: targetId });
			if (!targetExists) {
				logger.warn(`Unable to identify target ${targetId} by User ${userId}`);
				return res.status(404).send({ message: 'Target not found' });
			}

			// If the target exists, proceed to create the rating
			const newRating = await Rating.create({ ...req.body });
			logger.info(
				`New rating created with ID: ${newRating._id} by User ${userId}`
			);
			res.status(201).send({
				message: 'Rating created successfully',
				data: newRating,
			});
		} catch (error) {
			logger.error(`Error creating rating: ${error.message}`, { error });
			Sentry.captureException(error);
			res.status(500).send({
				message: 'An error occurred',
				error: error.message,
			});
		}
	}
);

// Get ratings by target ID (e.g., a pet or user)
router.get('/target/:targetId', authenticateToken, async (req, res) => {
	try {
		const { targetId } = req.params;
		logger.info(`Fetching ratings for targetId: ${targetId}`);
		const ratings = await Rating.find({ targetId });
		if (ratings.length === 0) {
			logger.warn(`No ratings found for targetId: ${targetId}`);
			return res.status(404).send({ message: 'No ratings found' });
		}
		logger.info(
			`Successfully fetched ratings for targetId: ${targetId}. Count: ${ratings.length}`
		);
		res.status(200).send({
			message: 'Ratings fetched successfully',
			data: ratings,
		});
	} catch (error) {
		logger.error(
			`Failed to fetch ratings for targetId: ${req.params.targetId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch ratings',
			error: error.message,
		});
	}
});

// Additional routes for updating and deleting ratings can follow a similar structure,
// including permission checks where necessary.

export default router;
