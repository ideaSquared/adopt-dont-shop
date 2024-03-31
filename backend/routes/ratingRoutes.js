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
import { generateObjectId } from '../utils/generateObjectId.js';

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

router.get('/find-ratings/:rescueId', authenticateToken, async (req, res) => {
	try {
		const { rescueId } = req.params;
		const rescueIdObjectId = generateObjectId(rescueId);
		logger.info(
			`Fetching likes and loves for all pets with ownerId: ${rescueId}`
		);

		const ratings = await Pet.aggregate([
			{ $match: { ownerId: rescueIdObjectId } },
			{
				$lookup: {
					from: 'ratings', // the collection to join
					localField: '_id', // field from the pets collection
					foreignField: 'targetId', // field from the ratings collection
					as: 'petRatings', // output array with joined documents
				},
			},
			{ $unwind: '$petRatings' }, // Deconstructs the petRatings array
			{
				$lookup: {
					from: 'users', // Join with users collection
					localField: 'petRatings.userId', // Assuming the ratings have a userId
					foreignField: '_id', // Assuming _id is used in users collection
					as: 'ratingUser',
				},
			},
			{
				$unwind: '$ratingUser', // Deconstructs the ratingUser array
			},
			{
				$project: {
					_id: '$petRatings._id', // Exclude pet ID from the final output
					petName: 1, // Assuming you have a petName field
					petId: '$petRatings.targetId',
					ratingType: '$petRatings.ratingType', // Assuming the structure of ratings includes likes
					userFirstName: '$ratingUser.firstName', // Assuming the structure of users includes firstName
					userId: '$ratingUser._id',
				},
			},
		]);

		if (!ratings.length) {
			logger.warn(`No ratings found for pets with ownerId: ${rescueId}`);
			return res.status(404).send({ message: 'No ratings found' });
		}

		logger.info(
			`Successfully fetched likes and loves for pets with ownerId: ${rescueId}.`
		);
		res.json(ratings);
	} catch (error) {
		logger.error(
			`Failed to fetch ratings for pets with ownerId: ${rescueId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch ratings',
			error: error.message,
		});
	}
});

router.get('/find-unrated', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.userId; // Assuming user ID is attached to the request by the authentication middleware

		const objectUserId = generateObjectId(userId);

		logger.info(`Fetching unrated pets for user ID: ${userId}`);

		// Use aggregation to find all Pet IDs that the userId has rated
		const ratedPetsIds = await Rating.aggregate([
			{
				$match: {
					userId: objectUserId,
					targetType: 'Pet',
					ratingSource: 'User',
				},
			},
			{ $group: { _id: '$targetId' } },
		]).exec();

		// Extract just the IDs for querying
		const ratedIds = ratedPetsIds.map((doc) => doc._id);

		// logger.info(`Rated Pets Found: ${ratedIds.length}`);

		// Find all pets that have not been rated by this userId
		const unratedPets = await Pet.find({ _id: { $nin: ratedIds } });

		// Log all unrated pets found
		// logger.info(`Unrated Pets Found: ${unratedPets.length}`);

		if (unratedPets.length === 0) {
			return res.status(404).send({ message: 'No unrated pets found' });
		}

		res.json(unratedPets);
	} catch (error) {
		logger.error(
			`Error fetching unrated pets for user ID: ${userId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

router.get('/find-rated', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.userId; // Assuming user ID is attached to the request by the authentication middleware

		const objectUserId = generateObjectId(userId);

		logger.info(`Fetching rated pets for user ID: ${userId}`);

		// Use aggregation to find all Pet IDs that the userId has rated
		const ratedPetsIds = await Rating.aggregate([
			{
				$match: {
					userId: objectUserId,
					targetType: 'Pet',
					ratingSource: 'User',
				},
			},
			{ $group: { _id: '$targetId' } },
		]).exec();

		// Extract just the IDs for querying
		const ratedIds = ratedPetsIds.map((doc) => doc._id);

		// logger.info(`Rated Pets IDs Found: ${ratedIds.length}`);

		// Find all pets that have been rated by this userId
		const ratedPets = await Pet.find({ _id: { $in: ratedIds } });

		// Log all rated pets found
		// logger.info(`Rated Pets Found: ${ratedPets.length}`);

		if (ratedPets.length === 0) {
			return res.status(404).send({ message: 'No rated pets found' });
		}

		res.json(ratedPets);
	} catch (error) {
		logger.error(
			`Error fetching rated pets for user ID: ${userId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

// Additional routes for updating and deleting ratings can follow a similar structure,
// including permission checks where necessary.

export default router;
