// adminRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authenticateToken = require('../middleware/authenticateToken');
const checkAdmin = require('../middleware/checkAdmin');
const nodemailer = require('nodemailer');
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
			await User.findByIdAndDelete(id);
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

			// Update the user's password
			await User.findByIdAndUpdate(id, { password: hashedPassword });
			res.json({ message: 'Password reset successfully.' });
		} catch (err) {
			console.error(err);
			res.status(500).json({ message: 'Failed to reset password.' });
		}
	}
);

module.exports = router;
