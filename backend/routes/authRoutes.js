// authRoutes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authenticateToken from '../middleware/authenticateToken.js';
import checkAdmin from '../middleware/checkAdmin.js';
import { generateResetToken } from '../utils/tokenGenerator.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import {
	validateRequest,
	registerSchema,
	loginSchema,
	updateDetailsSchema,
	resetPasswordSchema,
	forgotPasswordSchema,
} from '../middleware/joiValidateSchema.js'; // Adjust the path as necessary

export default function createAuthRoutes({
	tokenGenerator,
	emailService,
	User,
}) {
	const router = express.Router();

	// Register User
	router.post(
		'/register',
		validateRequest(registerSchema),
		async (req, res) => {
			const { email, password, firstName } = req.body;
			try {
				const existingUser = await User.findOne({ email });
				if (existingUser) {
					return res.status(409).json({
						message: 'User already exists - please try login or reset password',
					});
				}

				const hashedPassword = await bcrypt.hash(password, 12);
				const user = await User.create({
					email,
					password: hashedPassword,
					firstName,
				});
				res.status(201).json({ message: 'User created!', userId: user._id });
			} catch (error) {
				res.status(500).json({ message: 'Creating user failed.' });
			}
		}
	);

	// Login User
	router.post('/login', validateRequest(loginSchema), async (req, res) => {
		const { email, password } = req.body;
		try {
			const user = await User.findOne({ email });
			if (!user || !(await bcrypt.compare(password, user.password))) {
				return res.status(401).json({
					message: 'Email does not exist or password is not correct.',
				});
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

	// Change Details User
	router.put(
		'/details',
		authenticateToken,
		validateRequest(updateDetailsSchema),
		async (req, res) => {
			const { email, password, firstName } = req.body;
			try {
				const userId = req.user.userId; // Extracted from authenticated token

				const user = await User.findById(userId);
				if (!user) {
					return res.status(404).json({ message: 'User not found.' });
				}

				if (firstName) user.firstName = firstName;
				if (email) user.email = email;
				if (password) {
					const hashedPassword = await bcrypt.hash(password, 12);
					user.password = hashedPassword;
				}

				await user.save();
				res.status(200).json({ message: 'User details updated successfully.' });
			} catch (error) {
				console.error('Error updating user details:', error);
				// Identify specific types of errors if possible and return more specific messages
				res.status(500).json({
					message: 'Failed to update user details. Please try again.',
				});
			}
		}
	);

	// Forgot Password - Request Reset
	router.post(
		'/forgot-password',
		validateRequest(forgotPasswordSchema),
		async (req, res) => {
			const { email } = req.body;
			try {
				const user = await User.findOne({ email });
				if (!user) {
					return res.status(404).json({ message: 'User not found.' });
				}

				const token = await generateResetToken();
				user.resetToken = token;
				user.resetTokenExpiration = Date.now() + 3600000; // 1 hour from now
				await user.save();

				const FRONTEND_BASE_URL =
					process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
				const resetURL = `${FRONTEND_BASE_URL}/reset-password?token=${token}`;

				await sendPasswordResetEmail(email, resetURL);
				res.status(200).json({
					message: 'Password reset email sent. Redirecting to login page...',
				});
			} catch (error) {
				console.error('Error in forgot-password route:', error);
				res
					.status(500)
					.json({ message: 'Failed to process password reset request.' });
			}
		}
	);

	// Reset Password
	router.post(
		'/reset-password',
		validateRequest(resetPasswordSchema),
		async (req, res) => {
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

				// Hash the new password
				const hashedPassword = await bcrypt.hash(newPassword, 12);
				user.password = hashedPassword;
				user.resetToken = undefined; // Clear the reset token fields after successful reset
				user.resetTokenExpiration = undefined;
				await user.save(); // Save the updated user object

				res.status(200).json({ message: 'Password has been reset.' });
			} catch (error) {
				console.error('Resetting password failed:', error);
				res.status(500).json({
					message:
						'An error occurred while resetting the password. Please try again.',
				});
			}
		}
	);

	// Logout
	router.post('/logout', (req, res) => {
		res.clearCookie('token');
		res.status(200).json({ message: 'Logged out successfully' });
	});

	// Endpoint to check the authentication status
	router.get('/status', authenticateToken, async (req, res) => {
		try {
			const user = await User.findById(req.user.userId);
			if (!user) {
				return res.status(404).json({ message: 'User not found.' });
			}

			res.status(200).json({
				isLoggedIn: true,
				userId: req.user.userId,
				isAdmin: user.isAdmin, // Assuming isAdmin is a property of the user document
			});
		} catch (error) {
			console.error('Failed to retrieve user status:', error);
			res.status(500).json({ message: 'Error checking user status.' });
		}
	});

	return router;
}
