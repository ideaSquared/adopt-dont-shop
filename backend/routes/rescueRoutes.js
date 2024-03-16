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

// Create a router for handling rescue-related routes.
const router = express.Router();

/**
 * Route handler for fetching all rescue organizations from the database.
 * It queries the Rescue collection without any filters, thus returning all documents.
 * On success, it returns a 200 status code along with a message and the fetched data.
 * On failure, it catches any errors, returning a 500 status code and the error message.
 */
router.get('/', async (req, res) => {
	try {
		const rescues = await Rescue.find({}); // Query to fetch all rescues.
		res.status(200).send({
			message: 'Rescues fetched successfully',
			data: rescues,
		});
	} catch (error) {
		res.status(500).send({
			message: 'Failed to fetch rescues',
			error: error.toString(),
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

router.get('/filter', async (req, res) => {
	const { type } = req.query; // Extract the type of rescue from query parameters.

	try {
		if (!type || !['Individual', 'Charity', 'Company'].includes(type)) {
			return res.status(400).send({
				message: 'Invalid or missing type query parameter',
			});
		}

		const rescues = await Rescue.find({ rescueType: type }); // Filter rescues by type.
		res.status(200).send({
			message: `${type} rescues fetched successfully`,
			data: rescues,
		});
	} catch (error) {
		res.status(500).send({
			message: `Failed to fetch ${type} rescues`,
			error: error.toString(),
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

router.get('/:id', async (req, res) => {
	const { id } = req.params; // Extract the ID from URL parameters.

	try {
		const rescue = await Rescue.findById(id);
		if (!rescue) {
			return res.status(404).send({ message: 'Rescue not found' });
		}
		res
			.status(200)
			.send({ message: 'Rescue fetched successfully', data: rescue });
	} catch (error) {
		res
			.status(500)
			.send({ message: 'Failed to fetch rescue', error: error.toString() });
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
	async (req, res) => {
		try {
			const newRescue = await Rescue.create(req.body); // Create a new rescue record with the provided body.
			res.status(201).send({
				message: 'Individual rescue created successfully',
				data: newRescue,
			});
		} catch (error) {
			res.status(400).send({
				message: 'Failed to create individual rescue',
				error: error.toString(),
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
	async (req, res) => {
		let { type } = req.params;
		type = capitalizeFirstChar(type); // Capitalize the first character to match the expected format.

		try {
			const isUnique = await rescueService.isReferenceNumberUnique(
				req.body.referenceNumber
			); // Ensure reference number uniqueness.
			if (!isUnique) {
				return res.status(400).send({
					message: 'A rescue with the given reference number already exists',
				});
			}

			const newRescue = await Rescue.create(req.body); // Create a new rescue record.
			res.status(201).send({
				message: `${type} rescue created successfully`,
				data: newRescue,
			});
		} catch (error) {
			res.status(400).send({
				message: `Failed to create ${type} rescue`,
				error: error.toString(),
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
	const { id } = req.params; // Extract the rescue ID from URL parameters.
	const updates = req.body; // Extract the fields to be updated from the request body.
	const userId = req.user?.userId; // Extract the user ID from the authenticated token.

	try {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).send({ message: 'Invalid rescue ID' });
		}

		const rescue = await Rescue.findById(id);
		if (!rescue) {
			return res.status(404).send({ message: 'Rescue not found' });
		}

		// Check if the authenticated user has permission to edit the rescue information.
		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId.toString() === userId &&
				staff.permissions.includes('edit_rescue_info')
		);

		if (!hasPermission) {
			return res
				.status(403)
				.send({ message: 'No permission to edit this rescue' });
		}

		// Apply the updates to the rescue document.
		Object.keys(updates).forEach((key) => {
			rescue[key] = updates[key];
		});

		await rescue.save(); // Save the updated document to the database.
		res.send({ message: 'Rescue updated successfully', data: rescue });
	} catch (error) {
		console.error('Update rescue error:', error);
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
	// Extract rescueId from URL parameters and staff details (userId, permissions) from the request body.
	const { rescueId } = req.params;
	const { userId, permissions } = req.body;
	// Extract the userId of the editor from the authenticated token.
	const editorUserId = req.user?.userId;

	try {
		// Fetch the rescue document by its ID.
		const rescue = await Rescue.findById(rescueId);
		// If the rescue is not found, return a 404 response.
		if (!rescue) return res.status(404).send({ message: 'Rescue not found' });

		// Check if the editor has permission to edit staff details.
		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId.equals(editorUserId) &&
				staff.permissions.includes('edit_rescue_info')
		);

		// If the editor does not have permission, return a 403 response.
		if (!hasPermission)
			return res.status(403).send({ message: 'No permission to edit staff' });

		// Check if the staff member already exists in the rescue's staff array.
		const staffIndex = rescue.staff.findIndex((staff) =>
			staff.userId.equals(userId)
		);
		if (staffIndex > -1) {
			// If the staff member exists, update their permissions.
			rescue.staff[staffIndex].permissions = permissions;
		} else {
			// If the staff member does not exist, add them to the rescue's staff array.
			rescue.staff.push({ userId, permissions, verifiedByRescue: false });
		}

		// Save the updated rescue document.
		await rescue.save();
		// Return a success response with the updated staff details.
		res.send({ message: 'Staff updated successfully', data: rescue.staff });
	} catch (error) {
		// On error, return a 500 response with the error message.
		res
			.status(500)
			.send({ message: 'Failed to update staff', error: error.toString() });
	}
});

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
		// Extract rescueId and staffId from URL parameters.
		const { rescueId, staffId } = req.params;
		// Extract the userId of the user attempting to verify the staff from the authenticated token.
		const userId = req.user?.userId;

		try {
			// Fetch the rescue document by its ID.
			const rescue = await Rescue.findById(rescueId);
			// If the rescue is not found, return a 404 response.
			if (!rescue) {
				return res.status(404).json({ message: 'Rescue not found' });
			}

			// Find the staff member by their ID within the rescue's staff array.
			const staffMember = rescue.staff.find(
				(member) => member._id.toString() === staffId
			);
			// If the staff member is not found, return a 404 response.
			if (!staffMember) {
				return res.status(404).json({ message: 'Staff member not found' });
			}

			// Check if the user has permission to verify staff members.
			const hasPermission = rescue.staff.some(
				(staffMember) =>
					staffMember.userId.toString() === userId.toString() &&
					staffMember.permissions.includes('edit_rescue_info')
			);

			// If the user does not have permission, return a 403 response.
			if (!hasPermission) {
				return res
					.status(403)
					.json({ message: 'No permission to verify staff' });
			}

			// Set the staff member's verifiedByRescue property to true to indicate they have been verified.
			staffMember.verifiedByRescue = true;
			// Save the updated rescue document.
			await rescue.save();
			// Return a success response indicating the staff member has been verified.
			return res
				.status(200)
				.json({ message: 'Staff member verified successfully' });
		} catch (error) {
			// On error, return a 500 response with the error message.
			return res
				.status(500)
				.json({ message: 'Failed to verify staff', error: error.toString() });
		}
	}
);

// Export the router to make it available for use within the Express application.
export default router;
