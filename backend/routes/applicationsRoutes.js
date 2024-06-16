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
import { permissionService } from '../services/permissionService.js';

const logger = new LoggerUtil('application-service').getLogger();
const router = express.Router();

// GET ALL applications by owner_id
router.get('/:ownerId', authenticateToken, async (req, res) => {
	const { ownerId } = req.params;
	try {
		logger.info(`Fetching applications for ownerId: ${ownerId}`);

		const rescueResult = await pool.query(
			'SELECT pet_id FROM pets WHERE owner_id = $1',
			[ownerId]
		);
		const petIds = rescueResult.rows.map((row) => row.pet_id);

		if (petIds.length === 0) {
			logger.info(`No pets found for ownerId: ${ownerId}`);
			return res.status(200).send([]);
		}

		const result = await pool.query(
			`SELECT a.*, 
				u.first_name, 
				p.name AS pet_name, 
				b.first_name AS actioned_by_name
			FROM applications a
			JOIN users u ON a.user_id = u.user_id
			JOIN pets p ON a.pet_id = p.pet_id
			LEFT JOIN users b ON a.actioned_by = b.user_id
			WHERE a.pet_id = ANY($1);`,
			[petIds]
		);

		logger.info(`Applications fetched successfully for ownerId: ${ownerId}`);
		res.status(200).send(result.rows);
	} catch (error) {
		logger.error(
			`Error fetching applications for ownerId ${ownerId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

// GET all applications (admin)
router.get('/admin', authenticateToken, checkAdmin, async (req, res) => {
	try {
		logger.info('Fetching all applications for admin');

		const result = await pool.query(
			`SELECT a.*, u.first_name, p.name AS pet_name
			 FROM applications a
			 JOIN users u ON a.user_id = u.user_id
			 JOIN pets p ON a.pet_id = p.pet_id`
		);

		if (!result || !result.rows) {
			throw new Error('Unexpected response from database');
		}

		logger.info('Applications fetched successfully for admin');
		res.status(200).send(result.rows);
	} catch (error) {
		logger.error(`Error fetching applications for admin: ${error.message}`, {
			error,
		});
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

// GET all applications for pet_id (rescue)
router.get('/pet/:petId', authenticateToken, async (req, res) => {
	const { petId } = req.params;
	try {
		logger.info(`Fetching applications for petId: ${petId}`);

		const result = await pool.query(
			`SELECT a.*, u.first_name, p.name AS pet_name, b.first_name AS actioned_by_name
			 FROM applications a
			 JOIN users u ON a.user_id = u.user_id
			 JOIN pets p ON a.pet_id = p.pet_id
			 LEFT JOIN users b ON a.actioned_by = b.user_id
			 WHERE a.pet_id = $1`,
			[petId]
		);

		logger.info(`Applications fetched successfully for petId: ${petId}`);
		res.status(200).send(result.rows);
	} catch (error) {
		logger.error(
			`Error fetching applications for petId ${petId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

// GET count of applications for a pet_id (rescue)
router.get('/pet/:petId/count', authenticateToken, async (req, res) => {
	const { petId } = req.params;
	try {
		logger.info(`Counting applications for petId: ${petId}`);

		const result = await pool.query(
			`SELECT COUNT(*) AS application_count
			 FROM applications
			 WHERE pet_id = $1`,
			[petId]
		);

		logger.info(`Applications count fetched successfully for petId: ${petId}`);
		res.status(200).send({
			petId,
			application_count: parseInt(result.rows[0].application_count, 10),
		});
	} catch (error) {
		logger.error(
			`Error counting applications for petId ${petId}: ${error.message}`,
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
		logger.warn(
			`User ${req.user.userId} attempted to access applications for userId ${userId} without permission`
		);
		return res.status(403).json({ message: 'Forbidden' });
	}

	try {
		logger.info(`Fetching applications for userId: ${userId}`);

		const result = await pool.query(
			`SELECT a.*, u.first_name, p.name AS pet_name, b.first_name AS actioned_by_name
			 FROM applications a
			 JOIN users u ON a.user_id = u.user_id
			 JOIN pets p ON a.pet_id = p.pet_id
			 LEFT JOIN users b ON a.actioned_by = b.user_id
			 WHERE a.user_id = $1`,
			[userId]
		);

		logger.info(`Applications fetched successfully for userId: ${userId}`);
		res.status(200).json({ data: result.rows });
	} catch (error) {
		logger.error(
			`Error fetching applications for userId ${userId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
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

			logger.info(
				`Creating new application for userId: ${userId}, petId: ${petId}`
			);

			const result = await pool.query(
				`INSERT INTO applications (user_id, pet_id, description, status) 
				VALUES ($1, $2, $3, 'pending') 
				RETURNING *`,
				[userId, petId, description]
			);

			logger.info(
				`Application created successfully for userId: ${userId}, petId: ${petId}`
			);
			res.status(201).send({
				message: 'Application created successfully',
				data: result.rows[0],
			});
		} catch (error) {
			logger.error(
				`Error creating application for userId: ${req.user.userId}, petId: ${req.body.petId}: ${error.message}`,
				{ error }
			);
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
	validateRequest(updateApplicationSchema),
	async (req, res) => {
		try {
			const { applicationId } = req.params;
			const { status } = req.body;
			const actionedBy = req.user.userId;

			logger.info(
				`Updating applicationId: ${applicationId} by userId: ${actionedBy} with status: ${status}`
			);

			const hasPermission = await permissionService.checkPermission(
				req.user.userId,
				'action_applications'
			);

			if (!hasPermission) {
				logger.warn(
					`User ${req.user.userId} lacks permission to action applications`
				);
				return res
					.status(403)
					.send({ message: 'Insufficient permissions to action applications' });
			}

			const result = await pool.query(
				`UPDATE applications 
				SET status = $1, actioned_by = $2, updated_at = NOW() 
				WHERE application_id = $3 
				RETURNING *`,
				[status, actionedBy, applicationId]
			);

			if (result.rowCount === 0) {
				logger.warn(
					`Application not found for applicationId: ${applicationId}`
				);
				return res.status(404).send({ message: 'Application not found' });
			}

			logger.info(
				`Application updated successfully for applicationId: ${applicationId}`
			);
			res.status(200).send({
				message: 'Application updated successfully',
				data: result.rows[0],
			});
		} catch (error) {
			logger.error(
				`Error updating applicationId: ${req.params.applicationId}: ${error.message}`,
				{ error }
			);
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

		logger.info(
			`Deleting applicationId: ${applicationId} by userId: ${userId}`
		);

		const result = await pool.query(
			'SELECT * FROM applications WHERE application_id = $1',
			[applicationId]
		);
		const application = result.rows[0];

		if (!application) {
			logger.warn(`Application not found for applicationId: ${applicationId}`);
			return res.status(404).send({ message: 'Application not found' });
		}

		if (
			application.user_id !== userId &&
			!req.user.isAdmin &&
			!req.user.isRescue
		) {
			logger.warn(
				`User ${userId} lacks permission to delete applicationId: ${applicationId}`
			);
			return res.status(403).send({ message: 'Forbidden' });
		}

		await pool.query('DELETE FROM applications WHERE application_id = $1', [
			applicationId,
		]);

		logger.info(
			`Application deleted successfully for applicationId: ${applicationId}`
		);
		res.status(200).send({ message: 'Application deleted successfully' });
	} catch (error) {
		logger.error(
			`Error deleting applicationId: ${req.params.applicationId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'An error occurred',
			error: error.message,
		});
	}
});

export default router;
