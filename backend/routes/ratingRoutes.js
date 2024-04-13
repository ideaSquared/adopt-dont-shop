import express from 'express';
import Rating from '../models/Rating.js'; // Assuming your Rating model is in the models directory
import Pet from '../models/Pet.js';
import User from '../models/User.js';
import { pool } from '../dbConnection.js';
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

			// Determine which table to use based on the targetType
			let tableName;

			switch (targetType) {
				case 'Pet':
					tableName = 'pets'; // Assuming the table name for pets
					break;
				case 'User':
					tableName = 'users'; // Assuming the table name for users
					break;
				default:
					return res.status(400).send({ message: 'Invalid target type' });
			}

			// Check if the target entity exists
			const targetQuery = {
				text: `SELECT * FROM ${tableName} WHERE rating_id = $1`,
				values: [targetId],
			};
			const targetResult = await pool.query(targetQuery);
			const targetExists = targetResult.rowCount > 0;

			if (!targetExists) {
				logger.warn(`Unable to identify target ${targetId} by User ${userId}`);
				return res.status(404).send({ message: 'Target not found' });
			}

			// If the target exists, proceed to create the rating
			const insertRatingQuery = {
				text: `INSERT INTO ratings (target_type, target_id, rating, created_by) 
VALUES ($1, $2, $3, $4) 
RETURNING *
`,
				values: [targetType, targetId, req.body.rating, userId],
			};
			const insertedRatingResult = await pool.query(insertRatingQuery);
			const newRating = insertedRatingResult.rows[0];

			logger.info(
				`New rating created with ID: ${newRating.id} by User ${userId}`
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
		const query = {
			text: 'SELECT * FROM ratings WHERE target_id = $1',
			values: [targetId],
		};
		const result = await pool.query(query);
		const ratings = result.rows;
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
		logger.info(`Params: ${JSON.stringify(req.params)}`);
		const { rescueId } = req.params;
		logger.info(`Using rescueId: ${rescueId}`);

		logger.info(
			`Fetching likes and loves for all pets with ownerId: ${rescueId}`
		);

		const query = {
			text: `
				SELECT r.rating_id, p.name, r.target_id AS petId, r.rating_type AS ratingType, u.firstName AS userFirstName, r.user_id AS userId
				FROM pets p
				JOIN ratings r ON p.pet_id = r.target_id AND r.target_type = 'Pet'
				JOIN users u ON r.user_id = u.user_id
				WHERE p.owner_id = $1

			`,
			values: [rescueId],
		};

		const result = await pool.query(query);
		const ratings = result.rows;

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

		logger.info(`Fetching unrated pets for user ID: ${userId}`);

		const query = {
			text: `
				SELECT *
FROM pets
WHERE pet_id NOT IN (
    SELECT target_id
    FROM ratings
    WHERE user_id = $1 AND target_type = 'Pet' AND rating_source = 'User'
)

			`,
			values: [userId],
		};

		const result = await pool.query(query);
		const unratedPets = result.rows;

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

		logger.info(`Fetching rated pets for user ID: ${userId}`);

		const query = {
			text: `
				SELECT p.*
FROM pets p
WHERE p.pet_id IN (
    SELECT r.target_id
    FROM ratings r
    WHERE r.user_id = $1 AND r.target_type = 'Pet' AND r.rating_source = 'User'
)

			`,
			values: [userId],
		};

		const result = await pool.query(query);
		const ratedPets = result.rows;

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
