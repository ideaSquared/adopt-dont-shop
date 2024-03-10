// adminRoutes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js'; // Make sure the path is correct and includes .js extension
import authenticateToken from '../middleware/authenticateToken.js'; // Adjust the path as necessary and include .js extension
import checkAdmin from '../middleware/checkAdmin.js'; // Adjust the path as necessary and include .js extension
import nodemailer from 'nodemailer';

const router = express.Router();

router.get('/users', authenticateToken, checkAdmin, async (req, res) => {
	try {
		const users = await User.find({});
		res.json(users);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ message: 'An error occurred while fetching users.' });
	}
});

router.delete(
	'/users/delete/:id',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const { id } = req.params;
			const deletedUser = await User.findByIdAndDelete(id);
			if (!deletedUser) {
				return res.status(404).json({ message: 'User not found.' });
			}
			res.json({ message: 'User deleted successfully.' });
		} catch (err) {
			console.error(err);
			res.status(500).json({ message: 'Failed to delete user.' });
		}
	}
);

// Reset password for user by ID
router.post(
	'/users/reset-password/:id',
	authenticateToken,
	checkAdmin,
	async (req, res) => {
		try {
			const { id } = req.params;
			const { password } = req.body;

			// Hash the new password
			const hashedPassword = await bcrypt.hash(password, 12);

			// Attempt to update the user's password
			const updatedUser = await User.findByIdAndUpdate(
				id,
				{ password: hashedPassword },
				{ new: true }
			);

			if (!updatedUser) {
				return res.status(404).json({ message: 'User not found.' });
			}
			res.json({ message: 'Password reset successfully.' });
		} catch (err) {
			console.error(err);
			res.status(500).json({ message: 'Failed to reset password.' });
		}
	}
);

export default router;
