// Import dependencies for routing, database access, and utility functions.
import express from 'express';
import Rescue from '../models/Rescue.js'; // Mongoose model for Rescue documents.
import rescueService from '../services/rescueService.js'; // Service layer for additional business logic.
import { capitalizeFirstChar } from '../utils/stringManipulation.js'; // Utility for string manipulation.

import authenticateToken from '../middleware/authenticateToken.js'; // Middleware for authenticating JWT tokens.
import mongoose from 'mongoose'; // MongoDB object modeling tool designed to work in an asynchronous environment.
import {
	validateRequest,
	rescueJoiSchema,
} from '../middleware/joiValidateSchema.js'; // Middleware for validating request bodies against Joi schemas.
import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';

import fetchAndValidateCharity from '../utils/verifyCharity.js';
import fetchAndValidateCompany from '../utils/verifyCompany.js';

import { generateObjectId } from '../utils/generateObjectId.js';

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
		const rescues = await Rescue.find({});
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
		if (!type || !['Individual', 'Charity', 'Company'].includes(type)) {
			logger.warn('Invalid or missing type query parameter for rescue filter.');
			return res.status(400).send({
				message: 'Invalid or missing type query parameter',
			});
		}

		const rescues = await Rescue.find({ rescueType: type });
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
		const rescue = await Rescue.findById(id);
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
 * Route handler for creating a new rescue organization record with the type "Individual".
 * It validates the request body against the rescueJoiSchema to ensure required fields are provided.
 * On successful validation, creates a new document in the Rescue collection.
 * Returns a 201 status code with a success message and the created document data on success.
 * On validation failure or other errors, returns a 400 status code with an error message.
 */
router.post(
	'/individual',
	validateRequest(rescueJoiSchema),
	authenticateToken,
	async (req, res) => {
		try {
			const newRescue = await Rescue.create(req.body);
			logger.info('New individual rescue created successfully.');
			res.status(201).send({
				message: 'Individual rescue created successfully',
				data: newRescue,
			});
		} catch (error) {
			Sentry.captureException(error);
			logger.error('Failed to create individual rescue: ' + error.message);
			res.status(400).send({
				message: 'Failed to create individual rescue',
				error: error.message,
			});
		}
	}
);

/**
 * Route handler for creating new rescue organization records of types "Charity" or "Company".
 * It validates the request body against the rescueJoiSchema and checks the uniqueness of the reference number.
 * On successful validation and uniqueness check, creates a new document in the Rescue collection.
 * Returns a 201 status code with a success message and the created document data on success.
 * On failure, including validation errors or non-unique reference number, returns a 400 status code with an error message.
 */
router.post(
	'/:type(charity|company)',
	validateRequest(rescueJoiSchema),
	authenticateToken,
	async (req, res) => {
		let { type } = req.params;
		type = capitalizeFirstChar(type);

		try {
			if (req.body.referenceNumber) {
				const isUnique = await rescueService.isReferenceNumberUnique(
					req.body.referenceNumber
				);
				if (!isUnique) {
					logger.warn(
						`Rescue with reference number ${req.body.referenceNumber} already exists.`
					);
					return res.status(400).send({
						message: 'A rescue with the given reference number already exists',
					});
				}

				if (type === 'Charity') {
					// Validate the charity reference number
					const isValidCharity = await fetchAndValidateCharity(
						req.body.referenceNumber
					);

					if (isValidCharity) {
						req.body.referenceNumberVerified = true;
						logger.info(`Charity validated with ${req.body.referenceNumber}`);
					} else {
						req.body.referenceNumberVerified = false;
						logger.info(
							`Charity unable to be validated with ${req.body.referenceNumber}`
						);
					}
				} else if (type === 'Company') {
					// Validate the company house reference number
					const isValidCompany = await fetchAndValidateCompany(
						req.body.referenceNumber
					);

					if (isValidCompany) {
						req.body.referenceNumberVerified = true;
						logger.info(`Company validated with ${req.body.referenceNumber}`);
					} else {
						req.body.referenceNumberVerified = false;
						logger.info(
							`Company unable to be validated with ${req.body.referenceNumber}`
						);
					}
				}
			}

			const newRescue = await Rescue.create(req.body);
			logger.info(`${type} rescue created successfully.`);
			res.status(201).send({
				message: `${type} rescue created successfully`,
				data: newRescue,
			});
		} catch (error) {
			Sentry.captureException(error);
			logger.error(`Failed to create ${type} rescue: ` + error.message);
			res.status(400).send({
				message: `Failed to create ${type} rescue`,
				error: error.message,
			});
		}
	}
);

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
			const existingRescue = await Rescue.findById(rescueId);
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
				const isUnique = await rescueService.isReferenceNumberUnique(
					referenceNumber
				);
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
			if (type.toLowerCase() === 'charity') {
				const isValidCharity = await fetchAndValidateCharity(referenceNumber);
				if (isValidCharity) {
					existingRescue.referenceNumber = referenceNumber;
					existingRescue.referenceNumberVerified = true;
					logger.info(`Charity validated with ${referenceNumber}`);
				} else {
					existingRescue.referenceNumberVerified = false;
					logger.info(`Charity unable to be validated with ${referenceNumber}`);
				}
			} else if (type.toLowerCase() === 'company') {
				const isValidCompany = await fetchAndValidateCompany(referenceNumber);
				if (isValidCompany) {
					existingRescue.referenceNumber = referenceNumber;
					existingRescue.referenceNumberVerified = true;
					logger.info(`Company validated with ${referenceNumber}`);
				} else {
					existingRescue.referenceNumberVerified = false;
					logger.info(`Company unable to be validated with ${referenceNumber}`);
				}
			}

			await existingRescue.save();
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
			res.status(400).send({
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
	const updates = req.body;
	const editorUserId = req.user?.userId; // ID of the user making the request

	try {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			logger.warn(`Invalid rescue ID: ${id}`);
			return res.status(400).send({ message: 'Invalid rescue ID' });
		}

		const rescue = await Rescue.findById(id);
		if (!rescue) {
			logger.warn(`Rescue with ID ${id} not found for update.`);
			return res.status(404).send({ message: 'Rescue not found' });
		}

		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId === editorUserId && // Changed from .equals to ===
				staff.permissions.includes('edit_rescue_info')
		);

		if (!hasPermission) {
			logger.warn(
				`User ${editorUserId} attempted to edit rescue without permission.`
			);
			return res
				.status(403)
				.send({ message: 'No permission to edit this rescue' }); // Adjusted message to match test expectation
		}

		Object.keys(updates).forEach((key) => {
			rescue[key] = updates[key];
		});

		await rescue.save();
		logger.info(`Rescue with ID ${id} updated successfully.`);
		res.send({ message: 'Rescue updated successfully', data: rescue });
	} catch (error) {
		Sentry.captureException(error);
		logger.error(`Failed to update rescue with ID ${id}: ` + error.message);
		res
			.status(500)
			.send({ message: 'Failed to update rescue', error: error.message });
	}
});

/**
 * Route handler for adding a new staff member to a rescue organization or updating an existing staff member's permissions.
 * It authenticates the user token, validates the user's permissions to edit staff details, and either updates or adds the staff member based on the request body.
 * Returns a success message and the updated staff list on successful addition or update.
 * On failure, including permission errors or database errors, returns an appropriate error message and status code.
 */

router.put('/:rescueId/staff', authenticateToken, async (req, res) => {
	const { rescueId } = req.params; // ID of the rescue organization
	const { userId, permissions } = req.body; // Staff member details
	const editorUserId = req.user?.userId; // ID of the user making the request

	try {
		const rescue = await Rescue.findById(rescueId);
		if (!rescue) {
			logger.warn(`Rescue not found with ID: ${rescueId}`);
			return res.status(404).send({ message: 'Rescue not found' });
		}

		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId.equals(editorUserId) &&
				staff.permissions.includes('edit_rescue_info')
		);

		if (!hasPermission) {
			logger.warn(
				`User ${editorUserId} attempted to edit staff without permission.`
			);
			return res.status(403).send({ message: 'No permission to edit staff' });
		}

		const staffIndex = rescue.staff.findIndex((staff) =>
			staff.userId.equals(userId)
		);
		if (staffIndex > -1) {
			rescue.staff[staffIndex].permissions = permissions;
		} else {
			rescue.staff.push({ userId, permissions, verifiedByRescue: false });
		}

		await rescue.save();
		logger.info(`Staff updated successfully for rescue ID: ${rescueId}`);
		res.send({ message: 'Staff updated successfully', data: rescue.staff });
	} catch (error) {
		Sentry.captureException(error);
		logger.error(
			`Error updating staff for rescue ID: ${rescueId}: ${error.message}`
		);
		res
			.status(500)
			.send({ message: 'Failed to update staff', error: error.message });
	}
});

router.put(
	'/:rescueId/staff/:staffId/permissions',
	authenticateToken,
	async (req, res) => {
		const { rescueId } = req.params; // ID of the rescue organization
		const { staffId } = req.params; // ID of the staff member
		const { permissions } = req.body; // New permissions array

		const editorUserId = req.user.userId; // ID of the user making the request

		try {
			const rescue = await Rescue.findById(rescueId);
			if (!rescue) {
				logger.warn(`Rescue not found with ID: ${rescueId}`);
				return res.status(404).send({ message: 'Rescue not found' });
			}

			const hasPermission = rescue.staff.some(
				(staff) =>
					staff.userId.equals(editorUserId) &&
					staff.permissions.includes('edit_rescue_info')
			);

			if (!hasPermission) {
				logger.warn(
					`User ${editorUserId} attempted to edit permissions without the necessary permission.`
				);
				return res
					.status(403)
					.send({ message: 'No permission to edit permissions' });
			}

			const staffIndex = rescue.staff.findIndex((staff) =>
				staff.userId.equals(staffId)
			);
			if (staffIndex > -1) {
				// Update permissions directly if the staff member exists
				rescue.staff[staffIndex].permissions = permissions;
			} else {
				// Respond with an error if the specified staff member doesn't exist
				return res.status(404).send({ message: 'Staff member not found' });
			}

			await rescue.save();
			logger.info(
				`Permissions updated successfully for staff ID: ${staffId} in rescue ID: ${rescueId}`
			);
			res.send({
				message: 'Permissions updated successfully',
				data: rescue.staff[staffIndex],
			});
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Error updating permissions for staff ID: ${staffId} in rescue ID: ${rescueId}: ${error.message}`
			);
			res.status(500).send({
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
			const rescue = await Rescue.findById(rescueId);
			if (!rescue) {
				logger.warn(
					`Rescue not found with ID: ${rescueId} during staff verification`
				);
				return res.status(404).json({ message: 'Rescue not found' });
			}

			const staffMember = rescue.staff.find(
				(member) => member.userId.toString() === staffId.toString()
			);
			if (!staffMember) {
				logger.warn(
					`Staff member not found with ID: ${staffId} for verification`
				);
				return res.status(404).json({ message: 'Staff member not found' });
			}

			const hasPermission = rescue.staff.some(
				(staff) =>
					staff.userId.toString() === userId.toString() &&
					staff.permissions.includes('edit_rescue_info')
			);

			if (!hasPermission) {
				logger.warn(
					`User ${userId} attempted to verify staff without permission.`
				);
				return res
					.status(403)
					.json({ message: 'No permission to verify staff' });
			}

			staffMember.verifiedByRescue = true;
			await rescue.save();
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
			const rescue = await Rescue.findById(rescueId);
			if (!rescue) {
				logger.warn(`Rescue not found with ID: ${rescueId}`);
				return res.status(404).send({ message: 'Rescue not found' });
			}

			// Check if the user has permission to edit staff information.
			const hasPermission = rescue.staff.some(
				(staff) =>
					staff.userId.toString() === editorUserId.toString() &&
					staff.permissions.includes('edit_rescue_info')
			);

			if (!hasPermission) {
				logger.warn(
					`User ${editorUserId} attempted to delete staff without permission.`
				);
				return res
					.status(403)
					.send({ message: 'No permission to delete staff' });
			}

			// Prevent user from deleting their own user record.
			if (staffId === editorUserId) {
				logger.warn(`User ${editorUserId} attempted to delete their own user.`);
				return res.status(403).send({ message: 'Cannot delete your own user' });
			}

			// Find and remove the staff member from the staff array.
			const staffIndex = rescue.staff.findIndex(
				(staff) => staff.userId.toString() === staffId
			);
			if (staffIndex > -1) {
				rescue.staff.splice(staffIndex, 1); // Remove the staff member
				await rescue.save(); // Save the changes to the database
				logger.info(
					`Staff member with ID: ${staffId} deleted successfully from rescue ID: ${rescueId}`
				);
				return res
					.status(200)
					.send({ message: 'Staff member deleted successfully' });
			} else {
				return res.status(404).send({ message: 'Staff member not found' });
			}
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
