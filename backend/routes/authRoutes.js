// authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto'); // Node.js crypto module for token generation
const authenticateToken = require('../middleware/authenticateToken');
const checkAdmin = require('../middleware/checkAdmin');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
	host: import.meta.env.VITE_MAIL_HOST,
	port: import.meta.env.VITE_MAIL_PORT,
	auth: {
		user: import.meta.env.VITE_MAIL_USER,
		pass: import.meta.env.VITE_MAIL_PASS,
	},
});

// Register User
router.post('/register', async (req, res) => {
	const { email, password } = req.body;
	try {
		const hashedPassword = await bcrypt.hash(password, 12);
		const user = await User.create({
			email,
			password: hashedPassword,
		});
		res.status(201).json({ message: 'User created!', userId: user._id });
	} catch (error) {
		res.status(500).json({ message: 'Creating user failed.' });
	}
});

// Login User
router.post('/login', async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(401).json({ message: 'Invalid credentials.' });
		}
		const token = jwt.sign(
			{ userId: user._id, isAdmin: user.isAdmin },
			process.env.SECRET_KEY,
			{
				expiresIn: '1h',
			}
		);
		// Send token as HttpOnly cookie
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // Use secure in production
			sameSite: 'strict', // Adjust according to your needs
			maxAge: 3600000, // 1 hour in milliseconds
		});
		res.status(200).json({ userId: user._id, isAdmin: user.isAdmin });
	} catch (error) {
		res.status(500).json({ message: 'Logging in failed.' });
	}
});

// Update User Details
router.put('/details', authenticateToken, async (req, res) => {
	const { email, password } = req.body;
	try {
		const userId = req.user.userId; // Extracted from authenticated token

		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}

		if (email) user.email = email;
		if (password) {
			// It's crucial to hash the new password before saving it
			const hashedPassword = await bcrypt.hash(password, 12);
			user.password = hashedPassword;
		}

		await user.save();
		res.status(200).json({ message: 'User updated successfully.' });
	} catch (error) {
		res.status(500).json({ message: 'Updating user failed.' });
	}
});

// Forgot Password - Request Reset
router.post('/forgot-password', async (req, res) => {
	const { email } = req.body;
	crypto.randomBytes(32, async (err, buffer) => {
		if (err) {
			return res.status(500).json({ message: 'An error occurred.' });
		}
		const token = buffer.toString('hex');
		try {
			const user = await User.findOne({ email });
			if (!user) {
				return res.status(404).json({ message: 'User not found.' });
			}
			user.resetToken = token;
			user.resetTokenExpiration = Date.now() + 3600000; // 1 hour from now
			await user.save();

			const FRONTEND_BASE_URL =
				process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

			// Send email to user with reset link
			const resetURL = `${FRONTEND_BASE_URL}/reset-password?token=${token}`;
			const mailOptions = {
				from: 'your_email@example.com',
				to: email,
				subject: 'Reset Your Password',
				html: `<p>You requested a password reset. Click <a href="${resetURL}">here</a> to reset your password.</p>`,
			};

			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error('Error sending email:', error);
					return res
						.status(500)
						.json({ message: 'Password reset email could not be sent.' });
				} else {
					console.log('Password reset email sent:', info.response);
					return res.status(200).json({
						message: 'Password reset email sent. Redirecting to login page...',
					});
				}
			});
		} catch (error) {
			res.status(500).json({ message: 'Requesting password reset failed.' });
		}
	});
});

// Reset Password
router.post('/reset-password', async (req, res) => {
	const { token, newPassword } = req.body;
	try {
		const user = await User.findOne({
			resetToken: token,
			resetTokenExpiration: { $gt: Date.now() },
		});
		if (!user) {
			return res
				.status(400)
				.json({ message: 'Token is invalid or has expired.' });
		}
		const hashedPassword = await bcrypt.hash(newPassword, 12);
		user.password = hashedPassword;
		user.resetToken = undefined;
		user.resetTokenExpiration = undefined;
		await user.save();

		res.status(200).json({ message: 'Password has been reset.' });
	} catch (error) {
		console.error('Resetting password failed:', error);
		res.status(500).json({ message: 'Resetting password failed.' });
	}
});

// Logout
router.post('/logout', (req, res) => {
	res.clearCookie('token');
	res.status(200).json({ message: 'Logged out successfully' });
});

// Endpoint to check the authentication status
router.get('/status', authenticateToken, async (req, res) => {
	// Assuming req.user.userId is available from the authenticateToken middleware
	try {
		// Assuming you have a User model set up with Mongoose
		const user = await User.findById(req.user.userId);

		// Safety check to ensure user was found
		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}

		// Respond with isLoggedIn, userId, and isAdmin
		res.status(200).json({
			isLoggedIn: true,
			userId: req.user.userId,
			isAdmin: req.user.isAdmin, // Include the isAdmin flag from the user document
		});
	} catch (error) {
		console.error('Failed to retrieve user status:', error);
		res.status(500).json({ message: 'Error checking user status.' });
	}
});

module.exports = router;
