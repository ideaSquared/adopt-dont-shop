import express from 'express';
import Pet from '../models/Pet.js'; // Assuming your Pet model is in the models directory
import Rescue from '../models/Rescue.js'; // Assuming your Rescue model is in the models directory
import mongoose from 'mongoose';
import authenticateToken from '../middleware/authenticateToken.js';

import {
	validateRequest,
	petJoiSchema,
} from '../middleware/joiValidateSchema.js';

import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';
const logger = new LoggerUtil('pet-service').getLogger();

const router = express.Router();

// Helper function to check permissions
const checkPermission = async (userId, permissionRequired) => {
	if (!userId) throw new Error('No userId provided');

	const rescues = await Rescue.find({ 'staff.userId': userId });

	return rescues.some((rescue) =>
		rescue.staff.some(
			(staff) =>
				staff.userId.toString() === userId.toString() &&
				staff.permissions.includes(permissionRequired)
		)
	);
};

// Create a new pet record
router.post(
	'/',
	authenticateToken,
	validateRequest(petJoiSchema),
	async (req, res) => {
		try {
			const userId = req.user?.userId;

			const hasPermission = await checkPermission(userId, 'add_pet');
			if (!hasPermission) {
				logger.warn(
					`User ${userId} attempted to add pet without sufficient permissions.`
				);
				return res
					.status(403)
					.send({ message: 'Insufficient permissions to add pet' });
			}

			const newPet = await Pet.create(req.body);
			logger.info(`New pet created with ID: ${newPet._id} by User ${userId}`);
			res.status(201).send({
				message: 'Pet created successfully',
				data: newPet,
			});
		} catch (error) {
			logger.error(`Error creating pet: ${error.message}`, { error });
			Sentry.captureException(error);
			res.status(500).send({
				message: 'An error occurred',
				error: error.message,
			});
		}
	}
);

// Get all pet records
router.get('/', authenticateToken, async (req, res) => {
	try {
		logger.info('Fetching all pets');
		const pets = await Pet.find({});
		logger.info(`Successfully fetched all pets. Count: ${pets.length}`);
		res.status(200).send({
			message: 'Pets fetched successfully',
			data: pets,
		});
	} catch (error) {
		logger.error(`Failed to fetch pets: ${error.message}`, { error });
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch pets',
			error: error.message,
		});
	}
});

// Get a specific pet record by ID
router.get('/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params;
		logger.info(`Fetching pet with ID: ${id}`);
		const pet = await Pet.findById(id);
		if (!pet) {
			logger.warn(`Pet not found with ID: ${id}`);
			return res.status(404).send({ message: 'Pet not found' });
		}
		logger.info(`Successfully fetched pet with ID: ${id}`);
		res.status(200).send({
			message: 'Pet fetched successfully',
			data: pet,
		});
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

// Get all pet records by ownerId
router.get('/owner/:ownerId', authenticateToken, async (req, res) => {
	try {
		const { ownerId } = req.params;
		logger.info(`Fetching pets for ownerId: ${ownerId}`);
		const pets = await Pet.find({ ownerId: ownerId });
		if (pets.length === 0) {
			logger.warn(`No pets found for ownerId: ${ownerId}`);
			return res.status(404).send({ message: 'No pets found for this owner' });
		}
		logger.info(
			`Successfully fetched pets for ownerId: ${ownerId}. Count: ${pets.length}`
		);
		res.json(pets);
	} catch (error) {
		logger.error(
			`Failed to fetch pets for ownerId: ${req.params.ownerId}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch pets for this owner',
			error: error.message,
		});
	}
});

// Update a pet record by ID
router.put(
	'/:id',
	authenticateToken,

	async (req, res) => {
		const userId = req.user?.userId;
		const { id } = req.params;

		try {
			logger.info(`User ${userId} attempting to update pet with ID: ${id}`);
			const hasPermission = await checkPermission(userId, 'edit_pet');

			if (!hasPermission) {
				logger.warn(
					`User ${userId} lacks permission to edit pet with ID: ${id}`
				);
				return res
					.status(403)
					.send({ message: 'Insufficient permissions to edit pet' });
			}

			const pet = await Pet.findByIdAndUpdate(id, req.body, { new: true });
			if (!pet) {
				logger.warn(`Pet not found with ID: ${id} for update operation`);
				return res.status(404).send({ message: 'Pet not found' });
			}

			logger.info(`Pet with ID: ${id} updated successfully by User ${userId}`);
			res.status(200).send({
				message: 'Pet updated successfully',
				data: pet,
			});
		} catch (error) {
			logger.error(`Failed to update pet with ID: ${id}: ${error.message}`, {
				error,
				userId,
			});
			Sentry.captureException(error);
			res.status(500).send({
				message: 'Failed to update pet',
				error: error.message,
			});
		}
	}
);

// Delete a pet record by ID
router.delete('/:id', authenticateToken, async (req, res) => {
	const userId = req.user?.userId;
	const { id } = req.params;

	try {
		logger.info(`User ${userId} attempting to delete pet with ID: ${id}`);
		const hasPermission = await checkPermission(userId, 'delete_pet');

		if (!hasPermission) {
			logger.warn(
				`User ${userId} lacks permission to delete pet with ID: ${id}`
			);
			return res
				.status(403)
				.send({ message: 'Insufficient permissions to delete pet' });
		}

		const pet = await Pet.findByIdAndDelete(id);
		if (!pet) {
			logger.warn(`Pet not found with ID: ${id} for deletion`);
			return res.status(404).send({ message: 'Pet not found' });
		}

		logger.info(`Pet with ID: ${id} deleted successfully by User ${userId}`);
		res.status(200).send({
			message: 'Pet deleted successfully',
		});
	} catch (error) {
		logger.error(`Failed to delete pet with ID: ${id}: ${error.message}`, {
			error,
			userId,
		});
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to delete pet',
			error: error.message,
		});
	}
});

export default router;
