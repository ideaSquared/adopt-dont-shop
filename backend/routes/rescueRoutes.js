// rescueRoutes.js
import express from 'express';
import Rescue from '../models/Rescue.js'; // Adjust the path as necessary
import rescueService from '../services/rescueService.js';
import { capitalizeFirstChar } from '../utils/stringManipulation.js';
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

router.put('/:rescueId', async (req, res) => {
	const { rescueId } = req.params;
	const updates = req.body; // {rescueName, rescueAddress, etc.}
	const userId = req.user._id; // Assuming you have middleware to authenticate and add the user object

	try {
		const rescue = await Rescue.findById(rescueId);
		if (!rescue) return res.status(404).send({ message: 'Rescue not found' });

		// Check if user has edit permissions
		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId.equals(userId) &&
				staff.permissions.includes('edit_rescue_info')
		);

		if (!hasPermission)
			return res
				.status(403)
				.send({ message: 'No permission to edit this rescue' });

		// Perform the update
		Object.keys(updates).forEach((key) => {
			rescue[key] = updates[key];
		});

		await rescue.save();
		res.send({ message: 'Rescue updated successfully', data: rescue });
	} catch (error) {
		res
			.status(500)
			.send({ message: 'Failed to update rescue', error: error.toString() });
	}
});

router.put('/:rescueId/staff', async (req, res) => {
	const { rescueId } = req.params;
	const { userId, permissions } = req.body; // For adding or updating staff details
	const editorUserId = req.user._id; // The user attempting to make the change

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

router.put('/:rescueId/staff/:staffId/verify', async (req, res) => {
	const { rescueId, staffId } = req.params;
	const userId = req.user._id; // The user attempting to verify the staff

	try {
		const rescue = await Rescue.findById(rescueId);
		if (!rescue) return res.status(404).send({ message: 'Rescue not found' });

		// Check if the user has permission to verify staff
		const hasPermission = rescue.staff.some(
			(staff) =>
				staff.userId.equals(userId) &&
				staff.permissions.includes('edit_rescue_info')
		);

		if (!hasPermission)
			return res.status(403).send({ message: 'No permission to verify staff' });

		// Find and verify the staff member
		const staffMember = rescue.staff.id(staffId); // Using Mongoose's id method to find a subdocument
		if (!staffMember)
			return res.status(404).send({ message: 'Staff member not found' });

		staffMember.verifiedByRescue = true;
		await rescue.save();
		res.send({ message: 'Staff member verified successfully' });
	} catch (error) {
		res
			.status(500)
			.send({ message: 'Failed to verify staff', error: error.toString() });
	}
});

export default router;
