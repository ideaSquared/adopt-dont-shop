import express from 'express';
import { pool } from '../dbConnection.js';
import authenticateToken from '../middleware/authenticateToken.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { permissionService } from '../services/permissionService.js'; // Adjust the path as necessary
import { convertPetAge } from '../utils/petConvertMonthsToYears.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs';

import {
	validateRequest,
	petJoiSchema,
} from '../middleware/joiValidateSchema.js';

import Sentry from '@sentry/node';
import LoggerUtil from '../utils/Logger.js';
const logger = new LoggerUtil('pet-service').getLogger();

const router = express.Router();

// const permissionService.checkPermission = async (userId, permissionRequired) => {
// 	if (!userId) {
// 		throw new Error('No userId provided');
// 	}

// 	try {
// 		const client = await pool.connect();

// 		// Query to fetch staff member permissions
// 		const queryText = `
//             SELECT permissions
//             FROM staff_members
//             WHERE user_id = $1;
//         `;
// 		const { rows } = await client.query(queryText, [userId]);
// 		client.release(); // Release the client back to the pool

// 		// Check if the user has the required permission
// 		const hasPermission = rows.some((row) =>
// 			row.permissions.includes(permissionRequired)
// 		);

// 		// console.log('PERM');

// 		return hasPermission;
// 	} catch (error) {
// 		console.error('Error checking permission:', error);
// 		throw error;
// 	}
// };

// Create a new pet record
router.post(
	'/',
	authenticateToken, // Middleware to authenticate the user
	validateRequest(petJoiSchema), // Middleware to validate the request body against the Joi schema
	async (req, res) => {
		const userId = req.user.userId;
		try {
			// Check if the authenticated user has permission to add a new pet
			const hasPermission = await permissionService.checkPermission(
				userId,
				'add_pet'
			);
			if (!hasPermission) {
				logger.warn(
					`User ${userId} attempted to add pet without sufficient permissions.`
				);
				return res
					.status(403)
					.send({ message: 'Insufficient permissions to add pet' });
			}

			const insertPetQuery = `
        INSERT INTO pets (
          name, owner_id, short_description, long_description, age, gender, status, type, vaccination_status, breed,
          other_pets, household, energy, family, temperament, health, size, grooming_needs, training_socialization, commitment_level
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING pet_id;
      `;
			const {
				name,
				short_description,
				long_description,
				age,
				ownerId,
				gender,
				status,
				type,
				vaccination_status,
				breed,
				other_pets,
				household,
				energy,
				family,
				temperament,
				health,
				size,
				grooming_needs,
				training_socialization,
				commitment_level,
			} = req.body;

			// Insert the new pet into the database
			const newPetResult = await pool.query(insertPetQuery, [
				name,
				ownerId,
				short_description,
				long_description,
				age,
				gender,
				status,
				type,
				vaccination_status,
				breed,
				other_pets,
				household,
				energy,
				family,
				temperament,
				health,
				size,
				grooming_needs,
				training_socialization,
				commitment_level,
			]);
			const newPetId = newPetResult.rows[0].pet_id;

			logger.info(`New pet created with ID: ${newPetId} by User ${userId}`);
			res.status(201).send({
				message: 'Pet created successfully',
				data: { id: newPetId, ...req.body },
			});
		} catch (error) {
			logger.error(`Error creating pet: ${error.message}`, { error, userId });
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
		const pets = result.rows.map((pet) => ({
			...pet,
			age: convertPetAge(pet.age),
		}));
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
		const pet = {
			...result.rows[0],
			age: convertPetAge(result.rows[0].age),
		};
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

		const petQuery = 'SELECT * FROM pets WHERE owner_id = $1';
		const petResult = await pool.query(petQuery, [ownerId]);

		if (petResult.rowCount === 0) {
			logger.warn(`No pets found for ownerId: ${ownerId}`);
			return res.status(404).send({ message: 'No pets found for this owner' });
		}

		const pets = petResult.rows.map((pet) => ({
			...pet,
			age: convertPetAge(pet.age),
		}));
		const petIds = pets.map((pet) => pet.pet_id);

		const ratingQuery = `
			SELECT pet_id, rating_type, COUNT(*) AS count
			FROM ratings
			WHERE pet_id = ANY($1)
			GROUP BY pet_id, rating_type
		`;
		const ratingResult = await pool.query(ratingQuery, [petIds]);

		const ratings = ratingResult.rows.reduce((acc, row) => {
			if (!acc[row.pet_id]) {
				acc[row.pet_id] = {};
			}
			acc[row.pet_id][row.rating_type] = parseInt(row.count, 10);
			return acc;
		}, {});

		const applicationQuery = `
			SELECT pet_id, COUNT(*) AS application_count
			FROM applications
			WHERE pet_id = ANY($1)
			GROUP BY pet_id
		`;
		const applicationResult = await pool.query(applicationQuery, [petIds]);

		const applicationCounts = applicationResult.rows.reduce((acc, row) => {
			acc[row.pet_id] = parseInt(row.application_count, 10);
			return acc;
		}, {});

		const petsWithDetails = pets.map((pet) => ({
			...pet,
			ratings: ratings[pet.pet_id] || {},
			application_count: applicationCounts[pet.pet_id] || 0,
		}));

		logger.info(
			`Successfully fetched pets and details for ownerId: ${ownerId}. Count: ${pets.length}`
		);
		res.json(petsWithDetails);
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

router.put('/:id', authenticateToken, async (req, res) => {
	const userId = req.user?.userId;
	const { id } = req.params;

	try {
		logger.info(`User ${userId} attempting to update pet with ID: ${id}`);
		const hasPermission = await permissionService.checkPermission(
			userId,
			'edit_pet'
		);

		if (!hasPermission) {
			logger.warn(`User ${userId} lacks permission to edit pet with ID: ${id}`);
			return res
				.status(403)
				.send({ message: 'Insufficient permissions to edit pet' });
		}

		let updateSet = [];
		let values = [];
		let index = 1;

		for (const key in req.body) {
			if (
				req.body.hasOwnProperty(key) &&
				![
					'pet_id',
					'owner_id',
					'created_at',
					'archived',
					'updated_at',
				].includes(key)
			) {
				updateSet.push(`${key} = $${index}`);
				values.push(req.body[key]);
				index++;
			}
		}

		if (values.length === 0) {
			logger.warn(`No updatable fields provided for pet with ID: ${id}`);
			return res.status(400).send({ message: 'No updatable fields provided' });
		}

		values.push(id);

		if (updateSet.length > 0) {
			const queryText = `UPDATE pets SET ${updateSet.join(
				', '
			)}, updated_at = NOW() WHERE pet_id = $${index} RETURNING *`;
			const result = await pool.query(queryText, values);

			if (result.rowCount === 0) {
				logger.warn(`Pet not found with ID: ${id} for update operation`);
				return res.status(404).send({ message: 'Pet not found' });
			}

			const pet = result.rows[0];
			logger.info(`Pet with ID: ${id} updated successfully by User ${userId}`);
			res.status(200).send({ message: 'Pet updated successfully', data: pet });
		}
	} catch (error) {
		logger.error(`Failed to update pet with ID: ${id}: ${error.message}`, {
			error,
			userId,
		});
		Sentry.captureException(error);
		res
			.status(500)
			.send({ message: 'Failed to update pet', error: error.message });
	}
});

// Delete a pet record by ID
router.delete('/:id', authenticateToken, async (req, res) => {
	const userId = req.user?.userId;
	const { id } = req.params;

	try {
		logger.info(`User ${userId} attempting to delete pet with ID: ${id}`);
		const hasPermission = await permissionService.checkPermission(
			userId,
			'delete_pet'
		);

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
			const hasPermission = await permissionService.checkPermission(
				userId,
				'edit_pet'
			);
			if (!hasPermission) {
				logger.warn(
					`User ${userId} lacks permission to upload images for pet with ID: ${id}`
				);
				return res.status(403).send({
					message: 'Insufficient permissions to upload images for pet',
				});
			}

			const petQuery = {
				text: 'SELECT * FROM pets WHERE pet_id = $1',
				values: [id],
			};
			const petResult = await pool.query(petQuery);
			const pet = petResult.rows[0];

			if (!pet) {
				return res.status(404).send({ message: 'Pet not found' });
			}

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
				filenames: updatedImages, // Add this line
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
		const hasPermission = await permissionService.checkPermission(
			userId,
			'edit_pet'
		);
		if (!hasPermission) {
			logger.warn(
				`User ${userId} lacks permission to delete images for pet with ID: ${id}`
			);
			return res
				.status(403)
				.send({ message: 'Insufficient permissions to delete images for pet' });
		}

		const petQuery = {
			text: 'SELECT * FROM pets WHERE pet_id = $1',
			values: [id],
		};
		const petResult = await pool.query(petQuery);

		// Check if rows exist and if at least one row was returned
		if (!petResult.rows || petResult.rows.length === 0) {
			return res.status(404).send({ message: 'Pet not found' });
		}

		const pet = petResult.rows[0];

		const updatedImages = pet.images.filter(
			(image) => !imagesToDelete.includes(image)
		);
		const updatePetQuery = {
			text: 'UPDATE pets SET images = $1 WHERE pet_id = $2 RETURNING *',
			values: [updatedImages, id],
		};
		const updatedPetResult = await pool.query(updatePetQuery);
		const updatedPet = updatedPetResult.rows[0];

		logger.info(
			`Images deleted successfully for pet: ${id} by user: ${userId}`
		);

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
