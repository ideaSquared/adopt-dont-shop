// rescueRoutes.js
import express from 'express';
import Rescue from '../models/Rescue.js'; // Adjust the path as necessary
import rescueService from '../services/rescueService.js';
const router = express.Router();

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

router.post('/charity', async (req, res) => {
	const { rescueName, rescueAddress, referenceNumber, userId } = req.body;

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
			rescueType: 'Charity', // This could be dynamic based on route, if needed
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
			message: `Charity rescue created successfully`,
			data: newRescue,
		});
	} catch (error) {
		console.log(error); // Logging the error can be helpful for debugging
		let errorMessage = `Failed to create charity rescue`;

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

export default router;
