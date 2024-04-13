import express from 'express';
import Pet from '../models/Pet.js'; // Assuming your Pet model is in the models directory
import Rescue from '../models/Rescue.js'; // Assuming your Rescue model is in the models directory
import mongoose from 'mongoose';
import { pool } from '../dbConnection.js';
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
	if (!userId) {
		throw new Error('No userId provided');
	}

	try {
		const client = await pool.connect();

		// Query to fetch rescues where the user is a staff member
		const queryText = `
            SELECT * 
            FROM rescue 
            WHERE EXISTS (
                SELECT 1 
                FROM jsonb_array_elements(rescue.staff) AS staff 
                WHERE staff->>'userId' = $1
                AND staff->'permissions' @> JSON_BUILD_ARRAY($2)
            );
        `;
		const { rows } = await client.query(queryText, [
			userId,
			permissionRequired,
		]);
		client.release(); // Release the client back to the pool

		// Check if the user has the required permission in any of the rescues
		return rows.length > 0;
	} catch (error) {
		console.error('Error checking permission:', error);
		throw error;
	}
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

			const insertPetQuery = `
                INSERT INTO pets (name, type, age, breed, description, owner_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING pet_id;
            `;
			const { name, type, age, breed, description } = req.body;
			const newPetResult = await pool.query(insertPetQuery, [
				name,
				type,
				age,
				breed,
				description,
				userId,
			]);
			const newPetId = newPetResult.rows[0].pet_id;

			logger.info(`New pet created with ID: ${newPetId} by User ${userId}`);
			res.status(201).send({
				message: 'Pet created successfully',
				data: { id: newPetId, ...req.body },
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
		const query = 'SELECT * FROM pets';
		const result = await pool.query(query);
		const pets = result.rows;
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
		const query = 'SELECT * FROM pets WHERE pet_id = $1';
		const result = await pool.query(query, [id]);
		if (result.rowCount === 0) {
			logger.warn(`Pet not found with ID: ${id}`);
			return res.status(404).send({ message: 'Pet not found' });
		}
		const pet = result.rows[0];
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

		const query = 'SELECT * FROM pets WHERE owner_id = $1';
		const result = await pool.query(query, [ownerId]);
		if (result.rowCount === 0) {
			logger.warn(`No pets found for ownerId: ${ownerId}`);
			return res.status(404).send({ message: 'No pets found for this owner' });
		}
		const pets = result.rows;
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

/*
REFACTORED TO
*/
// Update a pet record by ID
router.put('/:id', authenticateToken, async (req, res) => {
	const userId = req.user?.userId;
	const { id } = req.params;

	try {
		logger.info(`User ${userId} attempting to update pet with ID: ${id}`);
		const hasPermission = await checkPermission(userId, 'edit_pet');

		if (!hasPermission) {
			logger.warn(`User ${userId} lacks permission to edit pet with ID: ${id}`);
			return res
				.status(403)
				.send({ message: 'Insufficient permissions to edit pet' });
		}

		// Construct the SQL query
		const query = {
			text: 'UPDATE pets SET pet_data = $1 WHERE pet_id = $2 RETURNING *',
			values: [req.body, id],
		};

		// Execute the query
		const result = await pool.query(query);

		// Check if the pet was updated successfully
		if (result.rowCount === 0) {
			logger.warn(`Pet not found with ID: ${id} for update operation`);
			return res.status(404).send({ message: 'Pet not found' });
		}

		const pet = result.rows[0];
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
});

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

		// Construct the SQL query to delete the pet
		const query = {
			text: 'DELETE FROM pets WHERE pet_id = $1 RETURNING *',
			values: [id],
		};

		// Execute the query
		const result = await pool.query(query);

		// Check if the pet was deleted successfully
		if (result.rowCount === 0) {
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
			const petQuery = {
				text: 'SELECT * FROM pets WHERE pet_id = $1',
				values: [id],
			};
			const petResult = await pool.query(petQuery);
			const pet = petResult.rows[0];

			if (!pet) {
				return res.status(404).send({ message: 'Pet not found' });
			}

			// Check permission logic here, as in your other routes
			const permissionQuery = {
				text: 'SELECT * FROM permissions WHERE user_id = $1 AND action = $2',
				values: [userId, 'edit_pet'],
			};
			const permissionResult = await pool.query(permissionQuery);
			const hasPermission = permissionResult.rowCount > 0;

			if (!hasPermission) {
				logger.warn(
					`User ${userId} lacks permission to edit pet with ID: ${id}`
				);
				return res
					.status(403)
					.send({ message: 'Insufficient permissions to edit pet' });
			}

			// Assuming you want to save the file paths to the pet document
			const updatedImages = req.files.map((file) => file.filename);
			const updatePetQuery = {
				text: 'UPDATE pets SET images = array_cat(images, $1) WHERE pet_id = $2 RETURNING *',
				values: [updatedImages, id],
			};
			const updatedPetResult = await pool.query(updatePetQuery);
			const updatedPet = updatedPetResult.rows[0];

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
		const petQuery = {
			text: 'SELECT * FROM pets WHERE pet_id = $1',
			values: [id],
		};
		const petResult = await pool.query(petQuery);
		const pet = petResult.rows[0];

		if (!pet) {
			return res.status(404).send({ message: 'Pet not found' });
		}

		// Check permission
		const permissionQuery = {
			text: 'SELECT * FROM permissions WHERE user_id = $1 AND action = $2',
			values: [userId, 'edit_pet'],
		};
		const permissionResult = await pool.query(permissionQuery);
		const hasPermission = permissionResult.rowCount > 0;

		if (!hasPermission) {
			logger.warn(`User ${userId} lacks permission to edit pet with ID: ${id}`);
			return res
				.status(403)
				.send({ message: 'Insufficient permissions to edit pet' });
		}

		// Remove images from the pet document
		const updatedImages = pet.images.filter(
			(image) => !imagesToDelete.includes(image)
		);
		const updatePetQuery = {
			text: 'UPDATE pets SET images = $1 WHERE pet_id = $2 RETURNING *',
			values: [updatedImages, id],
		};
		const updatedPetResult = await pool.query(updatePetQuery);
		const updatedPet = updatedPetResult.rows[0];

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
