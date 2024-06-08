import express from 'express';
import { pool } from '../dbConnection.js';
import authenticateToken from '../middleware/authenticateToken.js';
import {
	validateRequest,
	applicationSchema,
	updateApplicationSchema,
} from '../middleware/joiValidateSchema.js'; // Assuming you have a validation schema for applications
import Sentry from '@sentry/node';
import LoggerUtil from '../utils/Logger.js';
import checkAdmin from '../middleware/checkAdmin.js';

const logger = new LoggerUtil('application-service').getLogger();
const router = express.Router();

// Middleware to check if user is rescue
const checkRescue = (req, res, next) => {
	if (!req.user.isRescue) {
		return res.status(403).send({ message: 'Forbidden' });
	}
	next();
};

// GET all applications (admin)
router.get('/', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM applications');
		res.status(200).send(result.rows);
	} catch (error) {
		logger.error(`Error fetching applications: ${error.message}`, { error });
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

// GET all applications for pet_id (rescue)
router.get('/pet/:petId', authenticateToken, checkRescue, async (req, res) => {
	try {
		const { petId } = req.params;
		const result = await pool.query(
			'SELECT * FROM applications WHERE pet_id = $1',
			[petId]
		);
		res.status(200).send(result.rows);
	} catch (error) {
		logger.error(
			`Error fetching applications for pet_id ${petId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

// GET all applications for a user_id (admin + user)
router.get('/user/:userId', authenticateToken, async (req, res) => {
	const { userId } = req.params; // Ensure userId is defined
	if (req.user.userId !== userId && !req.user.isAdmin) {
		return res.status(403).json({ message: 'Forbidden' });
	}

	try {
		const result = await pool.query(
			'SELECT * FROM applications WHERE user_id = $1',
			[userId]
		);
		res.status(200).json({ data: result.rows });
	} catch (error) {
		res
			.status(500)
			.json({ message: 'An error occurred', error: error.message });
	}
});

// POST new application (user)
router.post(
	'/',
	authenticateToken,
	validateRequest(applicationSchema),
	async (req, res) => {
		try {
			const { petId, description } = req.body;
			const userId = req.user.userId;
			const result = await pool.query(
				`INSERT INTO applications (user_id, pet_id, description, status) 
				VALUES ($1, $2, $3, 'pending') 
				RETURNING *`,
				[userId, petId, description]
			);
			res.status(201).send({
				message: 'Application created successfully',
				data: result.rows[0],
			});
		} catch (error) {
			logger.error(`Error creating application: ${error.message}`, { error });
			Sentry.captureException(error);
			res.status(500).send({
				message: 'An error occurred',
				error: error.message,
			});
		}
	}
);

// PUT approved/rejected (rescue)
router.put(
	'/:applicationId',
	authenticateToken,
	checkRescue,
	validateRequest(updateApplicationSchema),
	async (req, res) => {
		try {
			const { applicationId } = req.params;
			const { status } = req.body;
			const actionedBy = req.user.userId;

			const result = await pool.query(
				`UPDATE applications 
				SET status = $1, actioned_by = $2, updated_at = NOW() 
				WHERE application_id = $3 
				RETURNING *`,
				[status, actionedBy, applicationId]
			);

			if (result.rowCount === 0) {
				return res.status(404).send({ message: 'Application not found' });
			}

			res.status(200).send({
				message: 'Application updated successfully',
				data: result.rows[0],
			});
		} catch (error) {
			logger.error(`Error updating application: ${error.message}`, { error });
			Sentry.captureException(error);
			res.status(500).send({
				message: 'An error occurred',
				error: error.message,
			});
		}
	}
);

// DELETE application (admin + rescue + user)
router.delete('/:applicationId', authenticateToken, async (req, res) => {
	try {
		const { applicationId } = req.params;
		const userId = req.user.userId;

		const result = await pool.query(
			'SELECT * FROM applications WHERE application_id = $1',
			[applicationId]
		);
		const application = result.rows[0];

		if (!application) {
			return res.status(404).send({ message: 'Application not found' });
		}

		if (
			application.user_id !== userId &&
			!req.user.isAdmin &&
			!req.user.isRescue
		) {
			return res.status(403).send({ message: 'Forbidden' });
		}

		await pool.query('DELETE FROM applications WHERE application_id = $1', [
			applicationId,
		]);
		res.status(200).send({ message: 'Application deleted successfully' });
	} catch (error) {
		logger.error(`Error deleting application: ${error.message}`, { error });
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

export default router;
