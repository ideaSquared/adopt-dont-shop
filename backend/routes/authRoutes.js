// Import necessary modules and files.
import express from 'express'; // For routing.
import bcrypt from 'bcryptjs'; // For hashing passwords.
import jwt from 'jsonwebtoken'; // For creating JSON Web Tokens.
import User from '../models/User.js'; // User model for interacting with the database.
// Middleware for authentication and admin checks.
import authenticateToken from '../middleware/authenticateToken.js';
import checkAdmin from '../middleware/checkAdmin.js';
// Utilities for generating tokens and sending emails.
import { generateResetToken } from '../utils/tokenGenerator.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
// Validation middleware for request bodies.
import {
	validateRequest,
	registerSchema,
	loginSchema,
	updateDetailsSchema,
	resetPasswordSchema,
	forgotPasswordSchema,
} from '../middleware/joiValidateSchema.js';
import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere

export default function createAuthRoutes({
	tokenGenerator,
	emailService,
	User,
}) {
	const router = express.Router();

	/**
	 * Route handler for user registration. Validates the request body against the registerSchema,
	 * checks for existing users with the same email, hashes the password, and creates a new user in the database.
	 * Responds with a 201 status code and a success message if the user is created successfully.
	 * On failure, such as if the user already exists or there's an error during user creation, responds with an appropriate error message and status code.
	 */
	router.post(
		'/register',
		validateRequest(registerSchema),
		async (req, res) => {
			const { email, password, firstName } = req.body;
			try {
				// Check if user already exists.
				const existingUser = await User.findOne({ email });
				if (existingUser) {
					return res.status(409).json({
						message: 'User already exists - please try login or reset password',
					});
				}
				// Hash the password and create a new user.
				const hashedPassword = await bcrypt.hash(password, 12);
				const user = await User.create({
					email,
					password: hashedPassword,
					firstName,
				});
				res.status(201).json({ message: 'User created!', userId: user._id });
			} catch (error) {
				entry.captureException('Error creating user:', error);
				res.status(500).json({ message: 'Creating user failed.' });
			}
		}
	);

	/**
	 * Route handler for user login. Validates the request body against the loginSchema,
	 * verifies the user's email and password, generates a JWT token, and sends it as a HttpOnly cookie.
	 * Responds with a 200 status code, the user ID, and admin status on successful login.
	 * On failure, such as if the email or password is incorrect, or if there's an error during the process, responds with an appropriate error message and status code.
	 */

	router.post('/login', validateRequest(loginSchema), async (req, res) => {
		const { email, password } = req.body;
		try {
			// Check if user exists and password is correct.
			const user = await User.findOne({ email });
			if (!user || !(await bcrypt.compare(password, user.password))) {
				return res.status(401).json({
					message: 'Email does not exist or password is not correct.',
				});
			}
			// Generate a token and send it as a HttpOnly cookie.
			const token = jwt.sign(
				{ userId: user._id, isAdmin: user.isAdmin },
				process.env.SECRET_KEY,
				{ expiresIn: '1h' }
			);
			res.cookie('token', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 3600000,
			});
			res.status(200).json({ userId: user._id, isAdmin: user.isAdmin });
		} catch (error) {
			entry.captureException('Error logging in:', error);
			res.status(500).json({ message: 'Logging in failed.' });
		}
	});

	/**
	 * Route handler for updating user details. Requires authentication.
	 * Validates the request body against the updateDetailsSchema, allows the authenticated user to update their own details like email, password, and firstName.
	 * Responds with a 200 status code and a success message upon successful update.
	 * On failure, such as if the user is not found or there's an error during the update process, responds with an appropriate error message and status code.
	 */

	router.put(
		'/details',
		authenticateToken,
		validateRequest(updateDetailsSchema),
		async (req, res) => {
			const { email, password, firstName } = req.body;
			try {
				// Update user details based on the authenticated user's ID.
				const userId = req.user.userId;
				const user = await User.findById(userId);
				if (!user) {
					return res.status(404).json({ message: 'User not found.' });
				}
				// Update provided fields.
				if (firstName) user.firstName = firstName;
				if (email) user.email = email;
				if (password) {
					const hashedPassword = await bcrypt.hash(password, 12);
					user.password = hashedPassword;
				}
				await user.save();
				res.status(200).json({ message: 'User details updated successfully.' });
			} catch (error) {
				Sentry.captureException(error);
				res.status(500).json({
					message: 'Failed to update user details. Please try again.',
				});
			}
		}
	);

	/**
	 * Route handler for initiating a password reset process. Validates the request body against the forgotPasswordSchema,
	 * generates a password reset token, saves it with the user's record, and sends a password reset email.
	 * Responds with a 200 status code and a message indicating that the reset email has been sent.
	 * On failure, such as if the user is not found or there's an error during the process, responds with an appropriate error message and status code.
	 */

	router.post(
		'/forgot-password',
		validateRequest(forgotPasswordSchema),
		async (req, res) => {
			const { email } = req.body;
			try {
				// Generate a reset token and send a password reset email.
				const user = await User.findOne({ email });
				if (!user) {
					return res.status(404).json({ message: 'User not found.' });
				}
				const token = await generateResetToken();
				user.resetToken = token;
				user.resetTokenExpiration = Date.now() + 3600000; // 1 hour from now.
				await user.save();
				const FRONTEND_BASE_URL =
					process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
				const resetURL = `${FRONTEND_BASE_URL}/reset-password?token=${token}`;
				await sendPasswordResetEmail(email, resetURL);
				res.status(200).json({
					message: 'Password reset email sent. Redirecting to login page...',
				});
			} catch (error) {
				Sentry.captureException(error);
				res
					.status(500)
					.json({ message: 'Failed to process password reset request.' });
			}
		}
	);

	/**
	 * Route handler for resetting the password. Validates the request body against the resetPasswordSchema,
	 * verifies the reset token and its expiration, hashes the new password, and updates the user's password in the database.
	 * Responds with a 200 status code and a success message upon successful password reset.
	 * On failure, such as if the token is invalid, has expired, or there's an error during the reset process, responds with an appropriate error message and status code.
	 */

	router.post(
		'/reset-password',
		validateRequest(resetPasswordSchema),
		async (req, res) => {
			const { token, newPassword } = req.body;
			try {
				// Find user by reset token and check if token is still valid.
				const user = await User.findOne({
					resetToken: token,
					resetTokenExpiration: { $gt: Date.now() },
				});
				if (!user) {
					return res
						.status(400)
						.json({ message: 'Token is invalid or has expired.' });
				}
				// Hash new password and update user document.
				const hashedPassword = await bcrypt.hash(newPassword, 12);
				user.password = hashedPassword;
				user.resetToken = undefined;
				user.resetTokenExpiration = undefined;
				await user.save();
				res.status(200).json({ message: 'Password has been reset.' });
			} catch (error) {
				Sentry.captureException(error);
				res.status(500).json({
					message:
						'An error occurred while resetting the password. Please try again.',
				});
			}
		}
	);

	/**
	 * Route handler for logging out the user. Clears the HttpOnly cookie containing the JWT token,
	 * effectively logging the user out of the application.
	 * Responds with a 200 status code and a success message.
	 */

	router.post('/logout', (req, res) => {
		res.clearCookie('token');
		res.status(200).json({ message: 'Logged out successfully' });
	});

	/**
	 * Route handler for checking the user's authentication status. Requires authentication.
	 * Verifies the user's authentication and returns their login status, user ID, and admin status.
	 * Responds with a 200 status code and the authentication status.
	 * On failure, such as if the user is not found, responds with an appropriate error message and status code.
	 */

	router.get('/status', authenticateToken, async (req, res) => {
		try {
			// Verify authentication and return user status.
			const user = await User.findById(req.user.userId);
			if (!user) {
				return res.status(404).json({ message: 'User not found.' });
			}
			res.status(200).json({
				isLoggedIn: true,
				userId: req.user.userId,
				isAdmin: user.isAdmin,
			});
		} catch (error) {
			Sentry.captureException(error);
			res.status(500).json({ message: 'Error checking user status.' });
		}
	});

	// Return the configured router.
	return router;
}
