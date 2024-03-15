// rescueRoutes.js
import express from 'express';
import Rescue from '../models/Rescue.js';
import rescueService from '../services/rescueService.js';
import { capitalizeFirstChar } from '../utils/stringManipulation.js';
import User from '../models/User.js';
import authenticateToken from '../middleware/authenticateToken.js';
import mongoose from 'mongoose';

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
router.post('/individual', async (req, res) => {
	const { userId } = req.body; // This now matches the test input

	try {
		const newRescue = await Rescue.create({
			rescueType: 'Individual',
			staff: [
				{
					userId,
					permissions: [
						'edit_rescue_info',
						'add_pet',
						'delete_pet',
						'edit_pet',
						'see_messages',
						'send_messages',
					],
					verifiedByRescue: true,
				},
			],
			// Include defaults or empty values for required fields not provided in the request
		});

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
});

router.post('/:type(charity|company)', async (req, res) => {
	const { rescueName, rescueAddress, referenceNumber, userId } = req.body;
	let { type } = req.params;
	type = capitalizeFirstChar(type);

	// Basic input validation
	if (!rescueName || !rescueAddress || !referenceNumber || !userId) {
		return res.status(400).send({
			message: 'Missing required fields',
		});
	}
	try {
		// Check for uniqueness of referenceNumber using the rescueService
		const isUnique = await rescueService.isReferenceNumberUnique(
			referenceNumber
		);
		if (!isUnique) {
			return res.status(400).send({
				message: 'A rescue with the given reference number already exists',
			});
		}

		const newRescue = new Rescue({
			rescueType: type, // This could be dynamic based on route, if needed
			rescueName: rescueName,
			rescueAddress: rescueAddress,
			referenceNumber: referenceNumber,
			referenceNumberVerified: false,
			staff: [
				{
					userId: userId,
					permissions: [
						'edit_rescue_info',
						'add_pet',
						'delete_pet',
						'edit_pet',
						'see_messages',
						'send_messages',
					],
					verifiedByRescue: true,
				},
			],
		});

		await newRescue.save();

		res.status(201).send({
			message: `${type} rescue created successfully`,
			data: newRescue,
		});
	} catch (error) {
		console.log(error); // Logging the error can be helpful for debugging
		let errorMessage = `Failed to create ${type} rescue`;

		// You might want to customize your error message based on the error
		// But be cautious about exposing sensitive error details
		if (error.name === 'ValidationError') {
			errorMessage = error.message;
		}

		res.status(400).send({
			message: errorMessage,
			error: error.toString(), // Consider removing or replacing this in production
		});
	}
});

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
		console.log('Rescue: ', rescue + '\n');
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
