// rescueRoutes.js
import express from 'express';
import Rescue from '../models/Rescue.js';
import rescueService from '../services/rescueService.js';
import { capitalizeFirstChar } from '../utils/stringManipulation.js';
import User from '../models/User.js';
import authenticateToken from '../middleware/authenticateToken.js';
import mongoose from 'mongoose';
import verifyCharityIsValid from '../utils/verifyCharityIsValid.js';
import verifyCompanyIsValid from '../utils/verifyCompanyIsValid.js';
import {
	validateRequest,
	rescueJoiSchema,
} from '../middleware/joiValidateSchema.js';

const router = express.Router();

// Route for fetching all rescues
router.get('/', async (req, res) => {
	try {
		const rescues = await Rescue.find({}); // Fetch all documents in the Rescue collection
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

// Route for fetching rescues by type (Individual, Charity, Company)
router.get('/filter', async (req, res) => {
	const { type } = req.query; // Extract type from query parameters

	try {
		// Validate the type parameter
		if (!type || !['Individual', 'Charity', 'Company'].includes(type)) {
			return res.status(400).send({
				message: 'Invalid or missing type query parameter',
			});
		}

		const rescues = await Rescue.find({ rescueType: type }); // Filter documents by rescueType
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

router.get('/:id', async (req, res) => {
	const { id } = req.params;
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

// Route for handling "Individual"
router.post(
	'/individual',
	validateRequest(rescueJoiSchema),
	async (req, res) => {
		// Assuming rescueJoiSchema is adapted to handle individual rescues appropriately
		try {
			const newRescue = await Rescue.create(req.body);
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

router.post(
	'/:type(charity|company)',
	validateRequest(rescueJoiSchema),
	async (req, res) => {
		// Your logic remains largely the same, but validation is now handled by the middleware
		let { type } = req.params;
		type = capitalizeFirstChar(type);

		try {
			// Check for uniqueness of referenceNumber using the rescueService
			const isUnique = await rescueService.isReferenceNumberUnique(
				req.body.referenceNumber
			);
			if (!isUnique) {
				return res.status(400).send({
					message: 'A rescue with the given reference number already exists',
				});
			}

			// Additional verification for charity or company can be integrated here as before
			const newRescue = await Rescue.create(req.body);

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

router.put('/:id', authenticateToken, async (req, res) => {
	const { id } = req.params;
	const updates = req.body; // Contains the fields to be updated
	const userId = req.user?.userId; // Ensure this is optional chaining in case user is undefined

	try {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).send({ message: 'Invalid rescue ID' });
		}

		const rescue = await Rescue.findById(id);
		if (!rescue) {
			return res.status(404).send({ message: 'Rescue not found' });
		}

		// Check if user has edit permissions
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

		// Perform the update
		Object.keys(updates).forEach((key) => {
			rescue[key] = updates[key];
		});

		await rescue.save();
		res.send({ message: 'Rescue updated successfully', data: rescue });
	} catch (error) {
		console.error('Update rescue error:', error);
		res
			.status(500)
			.send({ message: 'Failed to update rescue', error: error.message });
	}
});

router.put('/:rescueId/staff', authenticateToken, async (req, res) => {
	const { rescueId } = req.params;
	const { userId, permissions } = req.body; // For adding or updating staff details
	const editorUserId = req.user?.userId; // The user attempting to make the change

	try {
		const rescue = await Rescue.findById(rescueId);
		if (!rescue) return res.status(404).send({ message: 'Rescue not found' });

		// Check if the editor has permission to edit rescue staff
		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId.equals(editorUserId) &&
				staff.permissions.includes('edit_rescue_info')
		);

		if (!hasPermission)
			return res.status(403).send({ message: 'No permission to edit staff' });

		// Find the staff member to update or add new one
		const staffIndex = rescue.staff.findIndex((staff) =>
			staff.userId.equals(userId)
		);
		if (staffIndex > -1) {
			// Update existing staff member
			rescue.staff[staffIndex].permissions = permissions;
		} else {
			// Add new staff member
			rescue.staff.push({ userId, permissions, verifiedByRescue: false });
		}

		await rescue.save();
		res.send({ message: 'Staff updated successfully', data: rescue.staff });
	} catch (error) {
		res
			.status(500)
			.send({ message: 'Failed to update staff', error: error.toString() });
	}
});

router.put(
	'/:rescueId/staff/:staffId/verify',
	authenticateToken,
	async (req, res) => {
		const { rescueId, staffId } = req.params;
		const userId = req.user?.userId; // The user attempting to verify the staff

		try {
			const rescue = await Rescue.findById(rescueId);
			if (!rescue) {
				return res.status(404).json({ message: 'Rescue not found' });
			}

			const staffMember = rescue.staff.find(
				(member) => member._id.toString() === staffId
			);
			if (!staffMember) {
				return res.status(404).json({ message: 'Staff member not found' });
			}

			// Check if the user has permission to verify staff, comparing string representations
			const hasPermission = rescue.staff.some(
				(staffMember) =>
					staffMember.userId.toString() === userId.toString() &&
					staffMember.permissions.includes('edit_rescue_info')
			);

			if (!hasPermission) {
				return res
					.status(403)
					.json({ message: 'No permission to verify staff' });
			}

			// Verify the staff member
			staffMember.verifiedByRescue = true;
			await rescue.save();
			return res
				.status(200)
				.json({ message: 'Staff member verified successfully' });
		} catch (error) {
			return res
				.status(500)
				.json({ message: 'Failed to verify staff', error: error.toString() });
		}
	}
);

export default router;
