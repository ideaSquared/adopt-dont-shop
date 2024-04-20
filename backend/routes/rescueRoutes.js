// Import dependencies for routing, database access, and utility functions.
import express from 'express';

import { pool } from '../dbConnection.js';
import { capitalizeFirstChar } from '../utils/stringManipulation.js'; // Utility for string manipulation.

import authenticateToken from '../middleware/authenticateToken.js'; // Middleware for authenticating JWT tokens.
import {
	validateRequest,
	rescueJoiSchema,
} from '../middleware/joiValidateSchema.js'; // Middleware for validating request bodies against Joi schemas.
import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';

import fetchAndValidateCharity from '../utils/verifyCharity.js';
import fetchAndValidateCompany from '../utils/verifyCompany.js';

import { tokenGenerators } from '../utils/tokenGenerator.js';
import { emailService } from '../services/emailService.js';
import bcrypt from 'bcryptjs';

import { geoService } from '../services/geoService.js';
import { permissionService } from '../services/permissionService.js'; // Import the permissions utility

// Instantiate a logger for this module.
const logger = new LoggerUtil('rescue-route').getLogger();

// Create a router for handling rescue-related routes.
const router = express.Router();

/**
 * Route handler for fetching all rescue organizations from the database.
 * It queries the Rescue collection without any filters, thus returning all documents.
 * On success, it returns a 200 status code along with a message and the fetched data.
 * On failure, it catches any errors, returning a 500 status code and the error message.
 */
router.get('/', authenticateToken, async (req, res) => {
	try {
		const query = {
			text: `
				SELECT *
				FROM rescues
			`,
		};

		const result = await pool.query(query);
		const rescues = result.rows;

		res.status(200).send({
			message: 'Rescues fetched successfully',
			data: rescues,
		});
		logger.info('All rescues fetched successfully.');
	} catch (error) {
		Sentry.captureException(error);
		logger.error('Failed to fetch rescues: ' + error.message);
		res.status(500).send({
			message: 'Failed to fetch rescues',
			error: error.message,
		});
	}
});

/**
 * Route handler for filtering rescue organizations by their type (e.g., Individual, Charity, Company).
 * It extracts the 'type' query parameter from the request and uses it to filter the Rescue collection.
 * Validates the 'type' against predefined options before proceeding with the database query.
 * On success, returns a 200 status code with a success message and the filtered data.
 * On invalid or missing 'type', returns a 400 status code with an error message.
 * On failure, catches any errors, returning a 500 status code and the error message.
 */

router.get('/filter', authenticateToken, async (req, res) => {
	const { type } = req.query;

	try {
		if (!type || !['individual', 'charity', 'company'].includes(type)) {
			logger.warn('Invalid or missing type query parameter for rescue filter.');
			return res.status(400).send({
				message: 'Invalid or missing type query parameter',
			});
		}

		const query = {
			text: `
				SELECT *
				FROM rescues
				WHERE rescue_type = $1
			`,
			values: [type],
		};

		const result = await pool.query(query);
		const rescues = result.rows;

		logger.info(`${type} rescues fetched successfully.`);
		res.status(200).send({
			message: `${type} rescues fetched successfully`,
			data: rescues,
		});
	} catch (error) {
		Sentry.captureException(error);
		logger.error(`Failed to fetch ${type} rescues: ` + error.message);
		res.status(500).send({
			message: `Failed to fetch ${type} rescues`,
			error: error.message,
		});
	}
});

/**
 * Route handler for fetching a specific rescue organization by its database ID.
 * It extracts the 'id' parameter from the request URL and queries the Rescue collection.
 * On finding the document, returns a 200 status code with a success message and the document data.
 * If no document is found, returns a 404 status code with an error message.
 * On failure, catches any errors, returning a 500 status code and the error message.
 */

router.get('/:id', authenticateToken, async (req, res) => {
	const { id } = req.params;

	try {
		const query = {
			text: `
				SELECT *
				FROM rescues
				WHERE rescue_id = $1
			`,
			values: [id],
		};

		const result = await pool.query(query);
		const rescue = result.rows[0];

		if (!rescue) {
			logger.warn(`Rescue with ID ${id} not found.`);
			return res.status(404).send({ message: 'Rescue not found' });
		}

		logger.info(`Rescue with ID ${id} fetched successfully.`);
		res
			.status(200)
			.send({ message: 'Rescue fetched successfully', data: rescue });
	} catch (error) {
		Sentry.captureException(error);
		logger.error(`Failed to fetch rescue with ID ${id}: ` + error.message);
		res
			.status(500)
			.send({ message: 'Failed to fetch rescue', error: error.message });
	}
});

/**
 * Route Handler: Create New Rescue Organization Record
 *
 * Description:
 * - This route handler is responsible for creating new rescue organization records.
 * - Supports three types of organizations: "Individual", "Charity", and "Company".
 *
 * Validation:
 * - Validates request body against rescueJoiSchema.
 * - Performs user existence check, reference number uniqueness, and type-specific validation.
 *
 * Process Flow:
 * 1. Validates input data.
 * 2. Checks for existing user by email.
 * 3. For "Charity" and "Company", checks reference number uniqueness and conducts type-specific validation.
 * 4. Creates new user record, hashes password, and generates email verification token.
 * 5. Sends verification email to the user.
 * 6. Adds user to rescue's staff list with permissions and verified status.
 * 7. Creates and saves new rescue organization document.
 *
 * Responses:
 * - 201: Success, returns created document data.
 * - 400: Validation or process failure, returns error message.
 */
router.post('/:type(individual|charity|company)', async (req, res) => {
	let { type } = req.params;
	const { email, password, firstName, lastName, ...rescueData } = req.body;
	type = type.charAt(0).toUpperCase() + type.slice(1);

	try {
		logger.debug(`Creating rescue of type: ${type} with email: ${email}`);

		if (!password) {
			logger.error('Password is undefined.');
			return res.status(400).send({ message: 'Password is required.' });
		}

		const existingUserQuery = {
			text: 'SELECT * FROM users WHERE email = $1',
			values: [email],
		};
		const existingUserResult = await pool.query(existingUserQuery);
		if (existingUserResult.rows.length > 0) {
			logger.warn(`User already exists: ${email}`);
			return res.status(409).send({
				message: 'User already exists - please try login or reset password',
			});
		}

		const hashedPassword = await bcrypt.hash(password, 12);
		const verificationToken = await tokenGenerators.generateResetToken();

		let locationPoint;
		if (rescueData.city || rescueData.country) {
			try {
				locationPoint = await geoService.getGeocodePoint(
					rescueData.city,
					rescueData.country
				);
			} catch (error) {
				logger.error(`Geocoding failed: ${error.message}`);
				return res.status(500).json({
					message: 'Geocoding failed, unable to register user.',
				});
			}
		}

		let newUserQueryText = `
            INSERT INTO users (email, password, first_name, last_name, email_verified, verification_token, city, country`;
		let newUserQueryValues = [
			email,
			hashedPassword,
			firstName,
			lastName,
			false,
			verificationToken,
			rescueData.city,
			rescueData.country,
		];

		if (locationPoint) {
			newUserQueryText += `, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`;
			newUserQueryValues.push(locationPoint);
		} else {
			newUserQueryText += `) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;
		}

		const newUserResult = await pool.query({
			text: newUserQueryText,
			values: newUserQueryValues,
		});
		const user = newUserResult.rows[0];
		logger.info(`New user registered: ${user.user_id}`);

		const verificationURL = `${
			process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
		}/verify-email?token=${verificationToken}`;
		await emailService.sendEmailVerificationEmail(email, verificationURL);

		let referenceNumberVerified = false;
		if (type !== 'Individual' && rescueData.referenceNumber) {
			const isUniqueQuery = {
				text: 'SELECT * FROM rescues WHERE reference_number = $1',
				values: [rescueData.referenceNumber],
			};
			const isUniqueResult = await pool.query(isUniqueQuery);
			if (isUniqueResult.rows.length > 0) {
				logger.warn(
					`Rescue with reference number ${rescueData.referenceNumber} already exists.`
				);
				return res.status(400).send({
					message: 'A rescue with the given reference number already exists',
				});
			}

			// Verify the reference number for charity or company
			referenceNumberVerified =
				type === 'Charity'
					? await fetchAndValidateCharity(rescueData.referenceNumber)
					: type === 'Company'
					? await fetchAndValidateCompany(rescueData.referenceNumber)
					: false;
		}

		let newRescueQueryText = `
            INSERT INTO rescues (rescue_name, city, country, rescue_type, reference_number, reference_number_verified`;
		let newRescueQueryValues = [
			rescueData.rescueName,
			rescueData.city,
			rescueData.country,
			type,
			rescueData.referenceNumber,
			referenceNumberVerified,
		];

		if (locationPoint) {
			newRescueQueryText += `, location) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`;
			newRescueQueryValues.push(locationPoint);
		} else {
			newRescueQueryText += `) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
		}

		const newRescueResult = await pool.query({
			text: newRescueQueryText,
			values: newRescueQueryValues,
		});
		const newRescue = newRescueResult.rows[0];
		logger.info(`${type} rescue created successfully.`);

		const staffMemberQuery = {
			text: `
                INSERT INTO staff_members (user_id, verified_by_rescue, permissions, rescue_id)
                VALUES ($1, $2, $3, $4) RETURNING *;`,
			values: [
				user.user_id,
				true,
				[
					'edit_rescue_info',
					'view_rescue_info',
					'delete_rescue',
					'add_staff',
					'edit_staff',
					'verify_staff',
					'delete_staff',
					'view_staff',
					'view_pet',
					'add_pet',
					'edit_pet',
					'delete_pet',
					'create_messages',
					'view_messages',
				],
				newRescue.rescue_id,
			],
		};
		const staffMemberResult = await pool.query(staffMemberQuery);
		const staffMember = staffMemberResult.rows[0];
		logger.info(`Staff member created successfully: ${staffMember.user_id}`);

		res.status(201).send({
			message: `${type} rescue and staff member created successfully`,
			data: { user, newRescue, staffMember },
		});
	} catch (error) {
		Sentry.captureException(error);
		logger.error(`Failed to create ${type} rescue: ` + error.message);
		res.status(500).send({
			message: `Failed to create ${type} rescue`,
			error: error.message,
		});
	}
});

/**
 * Route handler for updating existing rescue organization records of types "Charity" or "Company".
 * Validates the request body against the rescueJoiSchema and checks the uniqueness of the reference number (if changed).
 * On successful validation and uniqueness check (if applicable), updates the document in the Rescue collection with the provided ID.
 * Returns a 200 status code with a success message and the updated document data on success.
 * On failure, including validation errors, non-unique reference number, or document not found, returns a 400 or 404 status code with an error message.
 */
router.put(
	'/:rescueId/:type(charity|company)/validate',
	authenticateToken,
	async (req, res) => {
		const { rescueId, type } = req.params; // Get rescueId and type from URL parameters
		const { referenceNumber } = req.body; // Correctly get referenceNumber from the request body
		const capitalizedType = capitalizeFirstChar(type);

		try {
			const existingRescueQuery = {
				text: 'SELECT * FROM rescues WHERE rescue_id = $1',
				values: [rescueId],
			};
			const existingRescueResult = await pool.query(existingRescueQuery);
			const existingRescue = existingRescueResult.rows[0];
			if (!existingRescue) {
				logger.warn(`Rescue with ID ${rescueId} not found.`);
				return res.status(404).send({
					message: 'Rescue not found',
				});
			}

			// Check for unique reference number if it's been provided and is different from the existing one
			if (
				referenceNumber &&
				referenceNumber !== existingRescue.referenceNumber
			) {
				const isUniqueQuery = {
					text: 'SELECT * FROM rescues WHERE reference_number = $1',
					values: [referenceNumber],
				};
				const isUniqueResult = await pool.query(isUniqueQuery);
				const isUnique = isUniqueResult.rows.length === 0;
				if (!isUnique) {
					logger.warn(
						`Rescue with reference number ${referenceNumber} already exists.`
					);
					return res.status(400).send({
						message: 'A rescue with the given reference number already exists',
					});
				}
			}

			// Type-specific validation
			let isValid = false;
			if (type.toLowerCase() === 'charity') {
				isValid = await fetchAndValidateCharity(referenceNumber);
			} else if (type.toLowerCase() === 'company') {
				isValid = await fetchAndValidateCompany(referenceNumber);
			}

			existingRescue.referenceNumber = isValid ? referenceNumber : null;
			existingRescue.referenceNumberVerified = isValid;
			await pool.query(
				'UPDATE rescues SET reference_number = $1, reference_number_verified = $2 WHERE rescue_id = $3',
				[
					existingRescue.referenceNumber,
					existingRescue.referenceNumberVerified,
					rescueId,
				]
			);

			logger.info(`${capitalizedType} rescue updated successfully.`);
			res.status(200).send({
				message: `${capitalizedType} rescue updated successfully`,
				data: existingRescue,
			});
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Failed to update ${capitalizedType} rescue: ` + error.message
			);
			res.status(500).send({
				message: `Failed to update ${capitalizedType} rescue`,
				error: error.message,
			});
		}
	}
);

/**
 * Route handler for updating the information of a specific rescue organization identified by its ID.
 * It authenticates the user token, extracts the rescue ID and updates from the request, and checks user permissions.
 * On successful permission check and validation, updates the specified fields of the document.
 * Returns a success message and the updated document data on successful update.
 * On failure, including invalid ID, lack of permission, or database errors, returns an appropriate error message and status code.
 */
router.put('/:id', authenticateToken, async (req, res) => {
	const { id } = req.params;
	const {
		rescueName,
		city,
		country,
		rescueType,
		referenceNumber,
		referenceNumberVerified,
	} = req.body;

	try {
		let locationPoint;
		// Handle geographic coordinate updates
		if (city && country) {
			try {
				const pointValue = await geoService.getGeocodePoint(city, country);
				locationPoint = pointValue ? `${pointValue}` : null;
			} catch (error) {
				logger.error(`Failed to geocode new location: ${error.message}`);
				return res.status(500).json({
					message: 'Geocoding failed, unable to update rescue details.',
				});
			}
		}

		let queryText = `
            UPDATE rescues
            SET
                rescue_name = $1,
                city = $2,
                country = $3,
                rescue_type = $4,
                reference_number = $5,
                reference_number_verified = $6
        `;
		let queryValues = [
			rescueName,
			city,
			country,
			rescueType,
			referenceNumber,
			referenceNumberVerified,
		];

		// If location point exists, add it to the query
		if (locationPoint) {
			queryText += `, location = $7 WHERE rescue_id = $8 RETURNING *;`;
			queryValues.push(locationPoint, id);
			logger.info(
				`Rescue ${id} location updated successfully to ${locationPoint} `
			);
		} else {
			queryText += ` WHERE rescue_id = $7 RETURNING *;`;
			queryValues.push(id);
		}

		const result = await pool.query({
			text: queryText,
			values: queryValues,
		});

		if (result.rows.length) {
			logger.info(`Rescue ${id} updated successfully.`);
			res.send({
				message: 'Rescue updated successfully',
				data: result.rows[0],
			});
		} else {
			res.status(404).send({ message: 'Rescue not found' });
		}
	} catch (error) {
		logger.error(
			`Failed to update ${capitalizedType} rescue: ` + error.message
		);
		res
			.status(500)
			.send({ message: 'Failed to update rescue', error: error.message });
	}
});

/**
 * Adds a new staff member to a specified rescue organization.
 * - Authentication: Requires a user token.
 * - Authorization: Validates that the requesting user has the 'add_staff' permission.
 * - Operation: Adds a staff member using the provided email in the request body, after checking for existing staff to prevent duplicates.
 * - Success Response: Returns a message with the success status and the updated list of staff members.
 * - Error Handling: Responds with an appropriate error message and status code for permission issues, duplicates, or other database errors.
 */
router.post('/:rescueId/staff', authenticateToken, async (req, res) => {
	const { rescueId } = req.params;
	const { email, permissions, firstName, password } = req.body;
	const editorUserId = req.user?.userId;

	try {
		const rescueQuery = {
			text: 'SELECT * FROM rescues WHERE rescue_id = $1',
			values: [rescueId],
		};
		const rescueResult = await pool.query(rescueQuery);
		const rescue = rescueResult.rows[0];
		if (!rescue) {
			logger.warn(`Rescue not found with ID: ${rescueId}`);
			return res.status(404).send({ message: 'Rescue not found' });
		}

		const hasPermission = await permissionService.checkPermission(
			editorUserId,
			'edit_rescue_info'
		);
		if (!hasPermission) {
			logger.warn(
				`User ${editorUserId} attempted to add staff without permission.`
			);
			return res.status(403).send({ message: 'No permission to add staff' });
		}

		let userQuery = {
			text: 'SELECT * FROM users WHERE email = $1',
			values: [email],
		};
		let userResult = await pool.query(userQuery);
		let user = userResult.rows[0];

		if (!user && firstName && password) {
			const hashedPassword = await bcrypt.hash(password, 12);
			const newUserQuery = {
				text: 'INSERT INTO users (email, password, first_name) VALUES ($1, $2, $3) RETURNING *',
				values: [email, hashedPassword, firstName],
			};
			const newUserResult = await pool.query(newUserQuery);
			user = newUserResult.rows[0];
		}

		const isStaffMemberQuery = {
			text: 'SELECT * FROM staff_members WHERE rescue_id = $1 AND user_id = $2',
			values: [rescueId, user.user_id],
		};
		const isStaffMemberResult = await pool.query(isStaffMemberQuery);
		const isStaffMember = isStaffMemberResult.rows.length > 0;
		if (isStaffMember) {
			logger.warn(`Staff member already exists for rescue ID: ${rescueId}`);
			return res.status(409).send({ message: 'Staff member already exists' });
		}

		const addStaffQuery = {
			text: 'INSERT INTO staff_members (rescue_id, user_id, permissions, verified_by_rescue, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING permissions, user_id, verified_by_rescue',
			values: [rescueId, user.user_id, permissions, false],
		};

		const addedStaffResult = await pool.query(addStaffQuery);
		const addedStaffRow = addedStaffResult.rows[0];

		const addedStaff = {
			userId: addedStaffRow.user_id,
			permissions: addedStaffRow.permissions,
			verifiedByRescue: addedStaffRow.verified_by_rescue,
			email: user.email, // Assuming 'email' is fetched or created earlier as part of user object
		};

		logger.info(
			`New staff member added successfully for rescue ID: ${rescueId}`
		);

		res.send({
			message: 'New staff member added successfully',
			data: addedStaff,
		});
	} catch (error) {
		Sentry.captureException(error);
		logger.error(
			`Error adding new staff for rescue ID: ${rescueId}: ${error.message}`
		);
		res
			.status(500)
			.send({ message: 'Failed to add new staff', error: error.message });
	}
});

router.put(
	'/:rescueId/staff/:staffId/permissions',
	authenticateToken,
	async (req, res) => {
		const { rescueId, staffId } = req.params;
		const { permissions } = req.body;
		const editorUserId = req.user.userId;

		try {
			const rescueQuery = {
				text: 'SELECT * FROM rescues WHERE rescue_id = $1',
				values: [rescueId],
			};
			const rescueResult = await pool.query(rescueQuery);
			const rescue = rescueResult.rows[0];

			if (!rescue) {
				logger.warn(`Rescue not found with ID: ${rescueId}`);
				return res.status(404).send({ message: 'Rescue not found' });
			}

			const hasPermission = await permissionService.checkPermission(
				editorUserId,
				'edit_rescue_info'
			);
			if (!hasPermission) {
				logger.warn(
					`User ${editorUserId} attempted to add staff without permission.`
				);
				return res.status(403).send({ message: 'No permission to add staff' });
			}

			const updateStaffPermissionsQuery = {
				text: 'UPDATE staff_members SET permissions = $1, updated_at = NOW() WHERE rescue_id = $2 AND user_id = $3 RETURNING *',
				values: [permissions, rescueId, staffId],
			};
			const updatedStaffResult = await pool.query(updateStaffPermissionsQuery);
			const updatedStaff = updatedStaffResult.rows[0];

			if (!updatedStaff) {
				return res.status(404).send({ message: 'Staff member not found' });
			}

			logger.info(
				`Permissions updated successfully for staff ID: ${staffId} in rescue ID: ${rescueId}`
			);
			return res.send({
				message: 'Permissions updated successfully',
				data: updatedStaff,
			});
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Error updating permissions for staff ID: ${staffId} in rescue ID: ${rescueId}: ${error.message}`
			);
			return res.status(500).send({
				message: 'Failed to update permissions',
				error: error.message,
			});
		}
	}
);

/**
 * Route handler for verifying a staff member of a specific rescue organization.
 * It authenticates the user token, checks if the authenticated user has permission to verify staff, and then updates the staff member's verified status.
 * Returns a success message on successful verification.
 * On failure, including lack of permission, staff member not found, or database errors, returns an appropriate error message and status code.
 */
router.put(
	'/:rescueId/staff/:staffId/verify',
	authenticateToken,
	async (req, res) => {
		const { rescueId, staffId } = req.params;
		const userId = req.user.userId;

		try {
			// Verify the existence of the rescue
			const rescueQuery = {
				text: 'SELECT * FROM rescues WHERE rescue_id = $1',
				values: [rescueId],
			};
			const rescueResult = await pool.query(rescueQuery);
			if (rescueResult.rows.length === 0) {
				logger.warn(
					`Rescue not found with ID: ${rescueId} during staff verification`
				);
				return res.status(404).json({ message: 'Rescue not found' });
			}

			// Verify staff member exists in the staff_members table and the current user has permission to verify
			const staffMemberQuery = {
				text: 'SELECT * FROM staff_members WHERE rescue_id = $1 AND user_id = $2',
				values: [rescueId, staffId],
			};
			const staffMemberResult = await pool.query(staffMemberQuery);
			if (staffMemberResult.rows.length === 0) {
				logger.warn(
					`Staff member not found with ID: ${staffId} for verification`
				);
				return res.status(404).json({ message: 'Staff member not found' });
			}

			const hasPermission = await permissionService.checkPermission(
				userId,
				'edit_rescue_info'
			);
			if (!hasPermission) {
				logger.warn(
					`User ${userId} attempted to verify staff without permission.`
				);
				return res
					.status(403)
					.send({ message: 'No permission to verify staff' });
			}

			// Verify the staff member
			const verifyStaffQuery = {
				text: 'UPDATE staff_members SET verified_by_rescue = true, updated_at = NOW() WHERE rescue_id = $1 AND user_id = $2',
				values: [rescueId, staffId],
			};
			await pool.query(verifyStaffQuery);

			logger.info(
				`Staff member ${staffId} verified successfully for rescue ID: ${rescueId}`
			);
			res.status(200).json({ message: 'Staff member verified successfully' });
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Error verifying staff member for rescue ID: ${rescueId}: ${error.message}`
			);
			res
				.status(500)
				.json({ message: 'Failed to verify staff', error: error.message });
		}
	}
);

router.delete(
	'/:rescueId/staff/:staffId',
	authenticateToken,
	async (req, res) => {
		const { rescueId, staffId } = req.params;
		const editorUserId = req.user?.userId; // ID of the user making the request

		try {
			// Verify the existence of the rescue
			const rescueQuery = {
				text: 'SELECT * FROM rescues WHERE rescue_id = $1',
				values: [rescueId],
			};
			const rescueResult = await pool.query(rescueQuery);
			if (rescueResult.rows.length === 0) {
				logger.warn(`Rescue not found with ID: ${rescueId}`);
				return res.status(404).send({ message: 'Rescue not found' });
			}

			const hasPermission = await permissionService.checkPermission(
				editorUserId,
				'edit_rescue_info'
			);
			if (!hasPermission) {
				logger.warn(
					`User ${editorUserId} attempted to delete staff without permission.`
				);
				return res
					.status(403)
					.send({ message: 'No permission to delete staff' });
			}

			// Prevent user from deleting their own user record
			if (staffId === editorUserId) {
				logger.warn(`User ${editorUserId} attempted to delete their own user.`);
				return res.status(403).send({ message: 'Cannot delete your own user' });
			}

			// Perform the deletion of the staff member
			const deleteStaffQuery = {
				text: 'DELETE FROM staff_members WHERE rescue_id = $1 AND user_id = $2',
				values: [rescueId, staffId],
			};
			await pool.query(deleteStaffQuery);

			logger.info(
				`Staff member with ID: ${staffId} deleted successfully from rescue ID: ${rescueId}`
			);
			res.status(200).send({ message: 'Staff member deleted successfully' });
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Error deleting staff member for rescue ID: ${rescueId}: ${error.message}`
			);
			res
				.status(500)
				.send({ message: 'Failed to delete staff', error: error.message });
		}
	}
);

// Export the router to make it available for use within the Express application.
export default router;
