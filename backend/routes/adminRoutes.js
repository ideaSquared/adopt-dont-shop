// Import necessary modules from the express framework and other utilities.
import express from 'express';
import bcrypt from 'bcryptjs'; // For hashing passwords.
import { pool } from '../dbConnection.js';
import authenticateToken from '../middleware/authenticateToken.js'; // Middleware to check if the request is authenticated.
import checkAdmin from '../middleware/checkAdmin.js'; // Middleware to check if the authenticated user is an admin.
import nodemailer from 'nodemailer'; // Imported but not used in this snippet. Potentially for sending emails (e.g., password reset instructions).
import { validateRequest } from '../middleware/joiValidateSchema.js'; // For validating request bodies against Joi schemas.

import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';
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
		const result = await pool.query('SELECT * FROM users');
		res.json(result.rows);
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
		const { id } = req.params;
		try {
			const result = await pool.query(
				'DELETE FROM users WHERE user_id = $1 RETURNING *',
				[id]
			);
			if (result.rows.length === 0) {
				logger.info(`Delete User: User with ID ${id} not found.`);
				return res.status(404).json({ message: 'User not found.' });
			}
			logger.info(`Delete User: User with ID ${id} deleted successfully.`);
			res.json({ message: 'User deleted successfully.' });
		} catch (err) {
			Sentry.captureException(err);
			logger.error(
				`Delete User: Failed to delete user with ID ${id}. Error: ${err.message}`
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
		const { id } = req.params;
		try {
			// Check if the user exists
			const result = await pool.query(
				'SELECT * FROM users WHERE user_id = $1',
				[id]
			);
			if (result.rowCount === 0) {
				return res.status(404).json({ message: 'User not found.' });
			}

			// Assuming the database has a column `reset_token_force_flag` to indicate reset requirement
			const updateResult = await pool.query(
				'UPDATE users SET reset_token_force_flag = TRUE WHERE user_id = $1 RETURNING *',
				[id]
			);

			if (updateResult.rowCount === 0) {
				// If no rows were updated, respond accordingly
				return res
					.status(404)
					.json({ message: 'Failed to update user for password reset.' });
			}

			// Respond to confirm the forced password reset flag has been set.
			logger.info(
				`Reset Password: Forced password reset flag for user with ID ${id} set to true successfully.`
			);
			res.json({
				message: 'Password reset required.',
			});
		} catch (err) {
			// Log and respond with an error if setting the forced password reset flag fails.
			Sentry.captureException(err); // Log the error to Sentry
			logger.error(
				`Reset Password: Failed to set forced password reset flag for user with ID ${id}. Error: ${err.message}`
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
			// Perform SQL JOIN to fetch all related data
			const query = `
        	SELECT 
				c.*,
				array_agg(DISTINCT CASE WHEN p.participant_type = 'User' AND u.email IS NOT NULL THEN u.email END) FILTER (WHERE u.email IS NOT NULL) AS participant_emails,
				array_agg(DISTINCT CASE WHEN p.participant_type = 'Rescue' AND r.rescue_name IS NOT NULL THEN r.rescue_name END) FILTER (WHERE r.rescue_name IS NOT NULL) AS participant_rescues,
				s.email AS started_by_email, 
				m.email AS last_message_by_email
			FROM 
				conversations c
				LEFT JOIN participants p ON c.conversation_id = p.conversation_id
				LEFT JOIN users u ON u.user_id = p.user_id AND p.participant_type = 'User'
				LEFT JOIN rescues r ON r.rescue_id = p.rescue_id AND p.participant_type = 'Rescue'
				LEFT JOIN users s ON s.user_id = c.started_by
				LEFT JOIN users m ON m.user_id = c.last_message_by
			GROUP BY 
				c.conversation_id, s.email, m.email;
      `;

			const { rows } = await pool.query(query);

			// Log message indicating all conversations have been fetched
			logger.info('Fetched all conversations');
			res.json(rows);
		} catch (error) {
			logger.error(`Error fetching conversations: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Route to get messages for a specific conversation
router.get(
	'/conversations/:conversationId/messages',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		const { conversationId } = req.params;
		try {
			const query = `
        SELECT 
          m.*, 
          u.email AS sender_email
        FROM 
          messages m
          JOIN users u ON u.user_id = m.sender_id
        WHERE 
          m.conversation_id = $1
      `;
			const { rows } = await pool.query(query, [conversationId]);

			logger.info(`Fetched all messages for ${conversationId}.`);
			res.json(rows);
		} catch (error) {
			logger.error(
				`Error fetching all messages for ${conversationId}: ${error.message}`
			);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

router.delete(
	'/conversations/:id',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		const { id } = req.params;
		try {
			const query =
				'DELETE FROM conversations WHERE conversation_id = $1 RETURNING *';
			const result = await pool.query(query, [id]);

			if (result.rowCount > 0) {
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
		const query = `
            SELECT 
                r.rescue_id,
                r.rescue_name AS "rescueName",
                r.rescue_type AS "rescueType",
				r.city,
				r.country,
                json_agg(json_build_object('userId', s.user_id, 'userDetails', json_build_object('email', u.email))) AS staff
            FROM 
                rescues r
            LEFT JOIN staff_members s ON r.rescue_id = s.rescue_id
            LEFT JOIN users u ON u.user_id = s.user_id
            GROUP BY r.rescue_id
        `;

		const { rows } = await pool.query(query);

		// Processing the rows to match the desired JSON structure
		const rescues = rows.map((row) => ({
			rescue_id: row.rescue_id,
			rescueName: row.rescueName,
			rescueType: row.rescueType,
			// rescue_address_line_1: row.address_line_1,
			// rescue_address_line_2: row.address_line_2,
			rescue_city: row.city,
			// rescue_county: row.county,
			// rescue_postcode: row.postcode,
			rescue_country: row.country,
			staff: row.staff.map((staffMember) => ({
				userId: staffMember.userId,
				userDetails: staffMember.userDetails || {},
			})),
		}));

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
		const query = `
            SELECT 
                r.rescue_id,
                r.rescue_name,
                r.rescue_type,
				r.city,
				r.country,
                json_agg(
                    json_build_object(
                        'userId', s.user_id,
                        'email', u.email,
                        'permissions', s.permissions
                    )
                ) FILTER (WHERE s.user_id IS NOT NULL) AS staff
            FROM 
                rescues r
            LEFT JOIN staff_members s ON r.rescue_id = s.rescue_id
            LEFT JOIN users u ON u.user_id = s.user_id
            WHERE r.rescue_id = $1
            GROUP BY r.rescue_id
        `;
		const { rows } = await pool.query(query, [id]);

		if (rows.length === 0) {
			return res.status(404).send({
				message: 'Rescue not found',
			});
		}

		const rescue = rows[0]; // Simplified extraction since rows are guaranteed to have only one element per GROUP BY

		logger.info(`Rescue fetched successfully for ${rescue.rescue_name}.`);
		res.json({
			rescue_id: rescue.rescue_id,
			rescue_name: rescue.rescue_name,
			rescue_type: rescue.rescue_type,
			// rescue_address_line_1: rescue.address_line_1,
			// rescue_address_line_2: rescue.address_line_2,
			rescue_city: rescue.city,
			// rescue_county: rescue.county,
			// rescue_postcode: rescue.postcode,
			rescue_country: rescue.country,
			staff: rescue.staff,
		});
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
	'/rescues/:id',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		const { id } = req.params;
		try {
			const query = 'DELETE FROM rescues WHERE rescue_id = $1 RETURNING *';
			const result = await pool.query(query, [id]);

			if (result.rowCount > 0) {
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

router.get('/pets', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const query = `
      SELECT 
        p.*,
        CASE
          WHEN r.rescue_name IS NOT NULL THEN r.rescue_name
          ELSE u.email
        END AS owner_info
      FROM 
        pets p
      LEFT JOIN rescues r ON p.owner_id = r.rescue_id
      LEFT JOIN users u ON p.owner_id = u.user_id
    `;
		const { rows } = await pool.query(query);
		logger.info('Fetching all pets');
		res.json(rows);
		logger.info(`Successfully fetched all pets. Count: ${rows.length}`);
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
	const { id } = req.params;
	try {
		const query = 'SELECT * FROM pets WHERE pet_id = $1';
		const { rows } = await pool.query(query, [id]);
		if (rows.length === 0) {
			logger.warn(`Pet not found with ID: ${id}`);
			return res.status(404).send({ message: 'Pet not found' });
		}
		logger.info(`Successfully fetched pet with ID: ${id}`);
		res.json(rows[0]);
	} catch (error) {
		logger.error(`Failed to fetch pet with ID: ${id}: ${error.message}`, {
			error,
		});
		Sentry.captureException(error);
		res.status(500).send({
			message: 'Failed to fetch pet',
			error: error.message,
		});
	}
});

router.delete('/pets/:id', authenticateToken, checkAdmin, async (req, res) => {
	const { id } = req.params;
	try {
		const query = 'DELETE FROM pets WHERE pet_id = $1 RETURNING *';
		const result = await pool.query(query, [id]);
		if (result.rowCount > 0) {
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
});

router.delete(
	'/rescues/:rescueId/staff/:staffId',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		const { rescueId, staffId } = req.params;
		try {
			// Check if the rescue exists
			const rescueCheck = await pool.query(
				'SELECT 1 FROM rescues WHERE rescue_id = $1',
				[rescueId]
			);
			if (rescueCheck.rowCount === 0) {
				logger.warn(`Rescue with ID ${rescueId} not found.`);
				return res.status(404).send({ message: 'Rescue not found.' });
			}

			// Delete the staff member from the rescue organization
			const deleteQuery = `
                DELETE FROM staff_members 
                WHERE rescue_id = $1 AND user_id = $2
                RETURNING *;
            `;
			const result = await pool.query(deleteQuery, [rescueId, staffId]);
			if (result.rowCount > 0) {
				logger.info(
					`Staff member with ID ${staffId} deleted from rescue ${rescueId} successfully.`
				);
				res.send({ message: 'Staff member deleted successfully.' });
			} else {
				logger.warn(
					`Staff member with ID ${staffId} not found in rescue ${rescueId}.`
				);
				return res.status(404).send({ message: 'Staff member not found.' });
			}
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

router.get(
	'/stats-created-count',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const fromDate = req.query.from || '2024-01-01';
			const toDate = req.query.to || '2024-12-31';

			// if (!fromDate || !toDate) {
			// 	return res
			// 		.status(400)
			// 		.json({ message: 'from and to dates are required' });
			// }

			const tables = [
				'users',
				'rescues',
				'pets',
				'conversations',
				'messages',
				'ratings',
			];
			const stats = {};

			for (const table of tables) {
				const query = `
                SELECT 
                    extract(week from created_at) AS week, 
                    count(*) AS count
                FROM 
                    ${table}
                WHERE 
                    created_at BETWEEN $1 AND $2
                GROUP BY 
                    week
                ORDER BY 
                    week;
            `;
				const { rows } = await pool.query(query, [fromDate, toDate]);
				stats[table] = rows.map((row) => ({
					week: parseInt(row.week, 10),
					count: parseInt(row.count, 10),
				}));
			}

			res.json(stats);
		} catch (error) {
			console.error('Error fetching stats:', error);
			res.status(500).json({ message: error.message });
		}
	}
);

router.get(
	'/stats-total-count',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const tables = [
				'users',
				'rescues',
				'pets',
				'conversations',
				'messages',
				'ratings',
			];
			const totalCounts = {};

			for (const table of tables) {
				const query = `
                SELECT 
                    count(*) AS total_count
                FROM 
                    ${table};
            `;
				const { rows } = await pool.query(query);
				totalCounts[table] = parseInt(rows[0].total_count, 10);
			}

			res.json(totalCounts);
		} catch (error) {
			console.error('Error fetching total counts:', error);
			res.status(500).json({ message: error.message });
		}
	}
);

router.get(
	'/stats-all-locations',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			// Define the tables and the data to fetch from each
			const tables = {
				users: ['location', 'city', 'country'],
				rescues: ['location', 'city', 'country'],
			};

			const locationsData = {};

			for (const [table, fields] of Object.entries(tables)) {
				// Construct SQL query to fetch city and country
				const query = `
                    SELECT 
                        ${fields.join(', ')} 
                    FROM 
                        ${table};
                `;
				const { rows } = await pool.query(query);
				// Accumulate data for each table
				locationsData[table] = rows.map((row) => ({
					city: row.city,
					country: row.country,
					location: row.location,
				}));
			}

			res.json(locationsData);
		} catch (error) {
			console.error('Error fetching location data:', error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Temporary endpoint to update createdAt and updatedAt fields randomly
// NOTE: Doesn't work for createdAt - but does update updatedAt
// router.post(
// 	'/update-timestamps',
// 	authenticateToken,
// 	checkAdmin,
// 	async (req, res) => {
// 		if (process.env.NODE_ENV !== 'development') {
// 			return res.status(403).json({
// 				message:
// 					'Forbidden: This operation is not allowed in the production environment.',
// 			});
// 		}

// 		const collections = [User, Conversation, Rescue, Pet, Message, Rating];
// 		const now = new Date();

// 		try {
// 			for (const collection of collections) {
// 				const docs = await collection.find({});
// 				await Promise.all(
// 					docs.map((doc) => {
// 						const createdAt =
// 							doc.createdAt ||
// 							new Date(now.getTime() - Math.random() * 12096e5); // Set random createdAt if not present
// 						return collection.updateOne(
// 							{ _id: doc._id },
// 							{
// 								$setOnInsert: { createdAt },
// 								$set: { updatedAt: now },
// 							},
// 							{ upsert: true } // This is crucial if the document didn't originally have createdAt
// 						);
// 					})
// 				);
// 			}
// 			res.json({
// 				message: 'Timestamps updated successfully for all documents.',
// 			});
// 		} catch (error) {
// 			logger.error(`Failed to update timestamps: ${error.message}`);
// 			Sentry.captureException(error);
// 			res.status(500).json({ message: 'Failed to update timestamps.' });
// 		}
// 	}
// );

// function getRandomElement(array) {
// 	return array[Math.floor(Math.random() * array.length)];
// }

// Generate random INSERT SQL statement for pets
// ! This is a test route to generate random SQL to add to the database. It should never be exposed to production but is useful locally.
// router.get('/generate-pet-sql', (req, res) => {
// 	const ownerIds = [
// 		'rescue_000009c8e9c8a9c7',
// 		'rescue_00000c85fb37b1b6',
// 		'rescue_000042c72a35070b',
// 		'rescue_000063e9026eaaca',
// 		'rescue_0000c55a398ef4dd',
// 		'rescue_0000f5b5d19fd0dd',
// 	];
// 	const genders = ['Male', 'Female', 'Other', 'Unknown'];
// 	const statuses = [
// 		'Available',
// 		'Reserved',
// 		'Adoption Pending',
// 		'Adopted',
// 		'Draft',
// 		'Quarantine',
// 		'On Hold',
// 		'Not Available for Adoption',
// 	];
// 	const types = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
// 	const vaccinatedStatuses = [
// 		'fully_vaccinated',
// 		'partially_vaccinated',
// 		'unvaccinated',
// 		'booster_required',
// 		'overdue_for_vaccinations',
// 		'medical_exemption',
// 	];

// 	const temperaments = [
// 		'confident_and_sociable',
// 		'timid_with_patience',
// 		'highly_trainable',
// 		'needs_experienced_owner',
// 	];

// 	const family = [
// 		'needs_quiet_home_without_children',
// 		'prefers_single_adult_household',
// 		'ideal_for_older_children_or_adults',
// 		'best_suited_for_teenagers',
// 		'suitable_for_young_children',
// 	];

// 	const energy = [
// 		'independent_self_sufficient',
// 		'enjoys_human_company',
// 		'shy_and_reserved',
// 		'moderately_active',
// 		'full_of_energy',
// 	];

// 	const household = [
// 		'needs_outdoor_space',
// 		'prefers_spending_outdoors',
// 		'enjoys_indoor_outdoor',
// 		'strictly_indoor_due_to_health',
// 		'prefers_living_indoors',
// 	];

// 	const otherPets = [
// 		'can_adapt_if_alone',
// 		'needs_adopt_with_companion',
// 		'not_live_with_specific_pet',
// 		'live_with_specific_pet',
// 		'friendly_with_small_animals',
// 		'coexist_with_dogs',
// 		'coexist_with_cats',
// 		'prefers_only_pet_household',
// 	];

// 	const commitmentLevel = ['first_time', 'active', 'relaxed'];

// 	const trainingSocialization = [
// 		'no_training_required',
// 		'basic_training_completed',
// 		'obedience_trained',
// 		'socialized_with_multiple_species',
// 		'needs_socialization',
// 	];

// 	const groomingNeeds = [
// 		'no_grooming',
// 		'low_maintenance',
// 		'regular_grooming_needed',
// 		'high_maintenance',
// 	];

// 	const size = ['extra_large', 'large', 'medium', 'small'];

// 	const health = [
// 		'recently_rehabilitated',
// 		'senior_pet',
// 		'dietary_restrictions',
// 		'special_needs',
// 		'perfect_health',
// 	];

// 	// Helper function to generate random names and descriptions
// 	const getRandomName = () =>
// 		`Pet_${Math.random().toString(36).substring(2, 7)}`;
// 	const getRandomDescription = () =>
// 		`A description for ${getRandomName()}, who is a wonderful companion.`;

// 	let sqlStatements = [];
// 	for (let i = 0; i < 50; i++) {
// 		const sqlownerId = getRandomElement(ownerIds);
// 		const sqlage = Math.floor(Math.random() * 15) + 1; // Random age between 1 and 15
// 		const sqlgender = getRandomElement(genders);
// 		const sqlstatus = getRandomElement(statuses);
// 		const sqltype = getRandomElement(types);
// 		const sqlarchived = Math.random() > 0.8; // 20% chance of being archived
// 		const sqlcreatedAt = new Date().toISOString().slice(0, 10);
// 		const sqlupdatedAt = sqlcreatedAt;
// 		const sqlname = getRandomName();
// 		const sqlshortDescription = 'Loving and caring, ready for a home.';
// 		const sqllongDescription = getRandomDescription();
// 		const sqlvaccinationStatus = getRandomElement(vaccinatedStatuses);
// 		const sqlbreed = 'Mixed';
// 		const sqlotherPets = getRandomElement(otherPets);
// 		const sqlhousehold = getRandomElement(household);
// 		const sqlenergy = getRandomElement(energy);
// 		const sqlfamily = getRandomElement(family);
// 		const sqltemperament = getRandomElement(temperaments);
// 		const sqlhealth = getRandomElement(health);
// 		const sqlsize = getRandomElement(size);
// 		const sqlgroomingNeeds = getRandomElement(groomingNeeds);
// 		const sqltrainingSocialization = getRandomElement(trainingSocialization);
// 		const sqlcommitmentLevel = getRandomElement(commitmentLevel);

// 		const sql = `INSERT INTO pets (owner_id, name, age, gender, status, type, archived, created_at, updated_at, short_description, long_description, vaccination_status, breed, other_pets, household, energy, family, temperament, health, size, grooming_needs, training_socialization, commitment_level) VALUES ('${sqlownerId}', '${sqlname}', ${sqlage}, '${sqlgender}', '${sqlstatus}', '${sqltype}', ${sqlarchived}, '${sqlcreatedAt}', '${sqlupdatedAt}', '${sqlshortDescription}', '${sqllongDescription}', '${sqlvaccinationStatus}', '${sqlbreed}', '${sqlotherPets}', '${sqlhousehold}', '${sqlenergy}', '${sqlfamily}', '${sqltemperament}', '${sqlhealth}', '${sqlsize}', '${sqlgroomingNeeds}', '${sqltrainingSocialization}', '${sqlcommitmentLevel}');`;
// 		sqlStatements.push(sql);
// 	}

// 	res.type('text').send(sqlStatements.join('\n'));
// });

function getRandomElement(array) {
	return array[Math.floor(Math.random() * array.length)];
}

// Export the router to make these routes available to the rest of the application.
export default router;
