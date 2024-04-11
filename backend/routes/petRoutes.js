import express from 'express';
import Pet from '../models/Pet.js'; // Assuming your Pet model is in the models directory
import Rescue from '../models/Rescue.js'; // Assuming your Rescue model is in the models directory
import mongoose from 'mongoose';
import authenticateToken from '../middleware/authenticateToken.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs';

import {
	validateRequest,
	petJoiSchema,
} from '../middleware/joiValidateSchema.js';

import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';
import { generateObjectId } from '../utils/generateObjectId.js';
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
		const objectIdId = generateObjectId(id);
		logger.info(`Fetching pet with ID: ${id}`);
		const pet = await Pet.findById(objectIdId);
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
		const objectIdOwner = generateObjectId(ownerId);
		const pets = await Pet.find({ ownerId: objectIdOwner });
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

const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/'); // Make sure this path exists and is writable
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		// Adjust the filename format here
		cb(null, 'image-' + uniqueSuffix + '-' + file.originalname);
	},
});

const upload = multer({ storage: storage });

// Endpoint to upload pet images
router.post(
	'/:id/images',
	authenticateToken,
	upload.array('images', 5),
	async (req, res) => {
		const { id } = req.params; // Pet ID
		const userId = req.user?.userId;

		try {
			const pet = await Pet.findById(id);
			if (!pet) {
				return res.status(404).send({ message: 'Pet not found' });
			}

			// Check permission logic here, as in your other routes
			const hasPermission = await checkPermission(userId, 'edit_pet');
			if (!hasPermission) {
				logger.warn(
					`User ${userId} lacks permission to edit pet with ID: ${id}`
				);
				return res
					.status(403)
					.send({ message: 'Insufficient permissions to edit pet' });
			}

			// Assuming you want to save the file paths to the pet document
			const updatedPet = await Pet.findByIdAndUpdate(
				id,
				{ $push: { images: req.files.map((file) => file.filename) } },
				{ new: true }
			);

			res.status(200).send({
				message: 'Images uploaded successfully',
				data: updatedPet,
			});
		} catch (error) {
			logger.error(
				`Failed to upload images for pet with ID: ${id}: ${error.message}`,
				{ error }
			);
			Sentry.captureException(error);
			res
				.status(500)
				.send({ message: 'Failed to upload images', error: error.message });
		}
	}
);

// Endpoint to delete pet images
router.delete('/:id/images', authenticateToken, async (req, res) => {
	const { id } = req.params; // Pet ID
	const userId = req.user?.userId;
	const { imagesToDelete } = req.body; // Array of filenames of images to delete

	if (!imagesToDelete || imagesToDelete.length === 0) {
		return res
			.status(400)
			.send({ message: 'No images specified for deletion' });
	}

	try {
		const pet = await Pet.findById(id);
		if (!pet) {
			return res.status(404).send({ message: 'Pet not found' });
		}

		// Check permission
		const hasPermission = await checkPermission(userId, 'edit_pet');
		if (!hasPermission) {
			logger.warn(`User ${userId} lacks permission to edit pet with ID: ${id}`);
			return res
				.status(403)
				.send({ message: 'Insufficient permissions to edit pet' });
		}

		// Filter out the images that are not found in the pet document
		const imagesToRemove = pet.images.filter((image) =>
			imagesToDelete.includes(image)
		);

		// Remove images from filesystem
		imagesToRemove.forEach((image) => {
			const imagePath = path.join(__dirname, '../uploads', image);
			if (fs.existsSync(imagePath)) {
				fs.unlinkSync(imagePath);
			}
		});

		// Update the pet document by removing the images
		const updatedPet = await Pet.findByIdAndUpdate(
			id,
			{ $pull: { images: { $in: imagesToRemove } } },
			{ new: true }
		);

		logger.info(`Successfully delete image for pet: ${id} by ${userId}`);

		res.status(200).send({
			message: 'Images deleted successfully',
			data: updatedPet,
		});
	} catch (error) {
		logger.error(
			`Failed to delete images for pet with ID: ${id}: ${error.message}`,
			{ error }
		);
		Sentry.captureException(error);
		res
			.status(500)
			.send({ message: 'Failed to delete images', error: error.message });
	}
});

export default router;
