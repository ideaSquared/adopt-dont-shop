// Import necessary modules and files.
import express from 'express'; // For routing.
import bcrypt from 'bcryptjs'; // For hashing passwords.
import jwt from 'jsonwebtoken'; // For creating JSON Web Tokens.
import { pool } from '../dbConnection.js';
// Middleware for authentication and admin checks.
import authenticateToken from '../middleware/authenticateToken.js';
import checkAdmin from '../middleware/checkAdmin.js';
// Utilities for generating tokens and sending emails.
import handlePasswordReset from '../utils/handleResetPassword.js';
// Validation middleware for request bodies.
import {
	validateRequest,
	registerSchema,
	loginSchema,
	updateDetailsSchema,
	resetPasswordSchema,
	forgotPasswordSchema,
} from '../middleware/joiValidateSchema.js';

import Sentry from '@sentry/node';
import LoggerUtil from '../utils/Logger.js';

import { tokenGenerators } from '../utils/tokenGenerator.js';
import { emailService } from '../services/emailService.js';

import { geoService } from '../services/geoService.js';

export default function createAuthRoutes({}) {
	const router = express.Router();
	const logger = new LoggerUtil('auth-service').getLogger(); // Initialize logger for auth-service

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
			const { email, password, firstName, lastName, city, country } = req.body;

			try {
				// Check if user already exists.
				const existingUserQuery = 'SELECT user_id FROM users WHERE email = $1';
				const emailNormalized = email.trim().toLowerCase();
				const existingUser = await pool.query(existingUserQuery, [
					emailNormalized,
				]);
				if (existingUser.rowCount > 0) {
					logger.warn(`Existing user error: ${email}`);
					return res.status(409).json({
						message: 'User already exists - please try login or reset password',
					});
				}

				// Hash the password, generate verification token
				const hashedPassword = await bcrypt.hash(password, 12);
				const verificationToken = await tokenGenerators.generateResetToken();

				// Get coordinates from city and country
				let locationPoint;
				try {
					locationPoint = await geoService.getGeocodePoint(city, country);
				} catch (error) {
					logger.error(`Geocoding failed: ${error.message}`);
					return res.status(500).json({
						message: 'Geocoding failed, unable to register user.',
					});
				}

				// Construct the base SQL query and values array
				let insertUserQuery = `
    INSERT INTO users (email, password, first_name, last_name, email_verified, verification_token, city, country`;
				let valuesArray = [
					emailNormalized,
					hashedPassword,
					firstName,
					lastName,
					false,
					verificationToken,
					city,
					country,
				];

				// Conditionally add location to the SQL query and values array
				if (locationPoint) {
					insertUserQuery += `, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id;`;
					valuesArray.push(locationPoint);
				} else {
					insertUserQuery += `) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id;`;
				}

				// Execute the query
				const newUser = await pool.query(insertUserQuery, valuesArray);

				const userId = newUser.rows[0].user_id;
				logger.info(`New user registered: ${userId}`);

				// Send verification email
				const FRONTEND_BASE_URL =
					process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
				const verificationURL = `${FRONTEND_BASE_URL}/verify-email?token=${verificationToken}`;
				await emailService.sendEmailVerificationEmail(
					emailNormalized,
					verificationURL
				);
				logger.info(`Verification email sent to: ${email}`);

				res.status(201).json({ message: 'User created!', userId });
			} catch (error) {
				logger.error(`Error creating user: ${error}`);
				Sentry.captureException(error);
				res.status(500).json({ message: 'Creating user failed.' });
			}
		}
	);

	router.get('/verify-email', async (req, res) => {
		const { token } = req.query;
		const logger = new LoggerUtil('auth-service').getLogger();
		try {
			const userQuery =
				'SELECT * FROM users WHERE verification_token = $1 AND email_verified = FALSE';
			const userResult = await pool.query(userQuery, [token]);
			if (userResult.rowCount === 0) {
				logger.warn(`Invalid or expired email verification token: ${token}`);
				return res.status(400).json({ message: 'Invalid or expired token' });
			}

			const user = userResult.rows[0];
			const updateUserQuery =
				'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE user_id = $1';
			await pool.query(updateUserQuery, [user.user_id]);

			logger.info(`Email verified for user: ${user.user_id}`);
			res.status(200).json({ message: 'Email verified successfully' });
		} catch (error) {
			logger.error(`Error verifying email: ${error}`);
			Sentry.captureException(error);
			res.status(500).json({ message: 'Email verification failed.' });
		}
	});

	/**
	 * Route handler for user login. Validates the request body against the loginSchema,
	 * verifies the user's email and password, generates a JWT token, and sends it as a HttpOnly cookie.
	 * Responds with a 200 status code, the user ID, and admin status on successful login.
	 * On failure, such as if the email or password is incorrect, or if there's an error during the process, responds with an appropriate error message and status code.
	 */

	router.post('/login', validateRequest(loginSchema), async (req, res) => {
		const { email, password } = req.body;
		try {
			// Check if the user exists
			const userQuery = 'SELECT * FROM users WHERE email = $1';
			const userResult = await pool.query(userQuery, [email]);
			if (userResult.rowCount === 0) {
				logger.info(`Login attempt failed: No user found with email ${email}`);
				return res.status(401).json({
					message: 'Email does not exist or password is not correct.',
				});
			}

			const user = userResult.rows[0];
			// Check if the password is correct
			if (!(await bcrypt.compare(password, user.password))) {
				logger.info(`Login attempt failed: Invalid credentials for ${email}`);
				return res.status(401).json({
					message: 'Email does not exist or password is not correct.',
				});
			}

			// Check if the user's email is verified
			if (!user.email_verified) {
				logger.info(`Login attempt failed: Email not verified for ${email}`);
				return res.status(403).json({
					message:
						'Email is not verified. Please verify your email before logging in.',
				});
			}

			if (user.reset_token_force_flag) {
				logger.warn(`Reset password required for: ${email}`);
				await handlePasswordReset(user);
				return res.status(403).json({
					message:
						'Password reset required. Please check your email to reset your password.',
				});
			}

			// Generate a token and send it as a HttpOnly cookie
			const token = jwt.sign(
				{ userId: user.user_id, isAdmin: user.is_admin },
				process.env.SECRET_KEY,
				{ expiresIn: '1h' }
			);
			logger.info(`User logged in: ${user.user_id}`);
			res.cookie('token', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 3600000,
			});
			res.status(200).json({ userId: user.user_id, isAdmin: user.is_admin });
		} catch (error) {
			logger.error(`Error logging in user: ${error}`);
			Sentry.captureException(error);
			res.status(500).json({ message: 'Logging in failed.' });
		}
	});

	router.get('/validate-session', authenticateToken, async (req, res) => {
		if (!req.user) {
			return res.status(401).json({ message: 'Invalid or expired token.' });
		}

		// Fetch additional user details if necessary
		const userDetailsQuery =
			'SELECT user_id, is_admin FROM users WHERE user_id = $1';
		const userDetailsResult = await pool.query(userDetailsQuery, [
			req.user.userId,
		]);
		if (userDetailsResult.rowCount === 0) {
			return res.status(404).json({ message: 'User not found.' });
		}

		const userDetails = userDetailsResult.rows[0];
		res.status(200).json({
			userId: userDetails.user_id,
			isAdmin: userDetails.is_admin,
		});
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
			const { email, password, firstName, lastName, city, country } = req.body;
			const userId = req.user.userId; // Extracting userId for logging purposes
			logger.info(`Updating user details for userId: ${userId}`); // Log the start of the process

			try {
				const userQuery = 'SELECT * FROM users WHERE user_id = $1';
				const userResult = await pool.query(userQuery, [userId]);
				if (userResult.rowCount === 0) {
					logger.warn(`User not found for userId: ${userId}`); // Log when user is not found
					return res.status(404).json({ message: 'User not found.' });
				}

				// Log the fields that are being updated
				let fieldsUpdated = [];
				const updates = [];
				const updateValues = [];
				if (firstName) {
					updates.push('first_name = $' + (updates.length + 2));
					updateValues.push(firstName);
					fieldsUpdated.push('firstName');
				}
				if (lastName) {
					updates.push('last_name = $' + (updates.length + 2));
					updateValues.push(lastName);
					fieldsUpdated.push('lastName');
				}
				if (email) {
					updates.push('email = $' + (updates.length + 2));
					updateValues.push(email);
					fieldsUpdated.push('email');
				}
				if (password) {
					const hashedPassword = await bcrypt.hash(password, 12);
					updates.push('password = $' + (updates.length + 2));
					updateValues.push(hashedPassword);
					fieldsUpdated.push('password');
				}
				if (city) {
					updates.push('city = $' + (updates.length + 2));
					updateValues.push(city);
					fieldsUpdated.push('city');
				}
				if (country) {
					updates.push('country = $' + (updates.length + 2));
					updateValues.push(country);
					fieldsUpdated.push('country');
				}

				// Handle geographic coordinate updates
				if (city || country) {
					try {
						// Get the POINT from longitude and latitude using the geocoding service
						const pointValue = await geoService.getGeocodePoint(city, country);

						// Check if a valid point was returned
						if (pointValue) {
							updates.push(`location = point${pointValue}`);
							fieldsUpdated.push('location'); // Note that we update 'location', not 'lat' and 'long'
						} else {
							// Log the case when no valid point is found but do not throw error or update location
							logger.info(
								'No valid geocode point found, location not updated.'
							);
						}
					} catch (error) {
						logger.error(`Failed to geocode new location: ${error.message}`);
						return res.status(500).json({
							message: 'Geocoding failed, unable to update user details.',
						});
					}
				}

				if (updates.length > 0) {
					const updateUserQuery = `
                    UPDATE users
                    SET ${updates.join(', ')}
                    WHERE user_id = $1
                    RETURNING *;
                `;
					await pool.query(updateUserQuery, [userId, ...updateValues]);
				}

				// Log successful update, including which fields were updated
				logger.info(
					`User details updated for userId: ${userId}. Fields updated: ${fieldsUpdated.join(
						', '
					)}`
				);

				res.status(200).json({ message: 'User details updated successfully.' });
			} catch (error) {
				logger.error(
					`Error updating user details for userId: ${userId}: ${error.message}`
				); // Log any exceptions
				Sentry.captureException(error);
				res.status(500).json({
					message: 'Failed to update user details. Please try again.',
				});
			}
		}
	);

	router.get('/details', authenticateToken, async (req, res) => {
		const userId = req.user.userId;
		logger.info(`Fetching user details for userId: ${userId}`); // Log the start of the process

		try {
			const userQuery =
				'SELECT user_id, email, first_name, last_name, city, country FROM users WHERE user_id = $1';
			const userResult = await pool.query(userQuery, [userId]);
			if (userResult.rowCount === 0) {
				logger.warn(`User not found for userId: ${userId}`); // Log when user is not found
				return res.status(404).json({ message: 'User not found.' });
			}

			const user = userResult.rows[0];
			// Prepare the data to be returned
			const userDetails = {
				userId: user.user_id,
				email: user.email,
				firstName: user.first_name,
				lastName: user.last_name,
				city: user.city,
				country: user.country,
			};

			logger.info(`User details fetched successfully for userId: ${userId}`);
			res.status(200).json(userDetails);
		} catch (error) {
			logger.error(
				`Error fetching user details for userId: ${userId}: ${error.message}`
			); // Log any exceptions
			Sentry.captureException(error);
			res.status(500).json({
				message: 'Failed to fetch user details. Please try again.',
			});
		}
	});

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
			logger.info(`Password reset requested for email: ${email}`); // Log the initiation of a password reset request

			try {
				const userQuery = 'SELECT * FROM users WHERE email = $1';
				const userResult = await pool.query(userQuery, [email]);
				if (userResult.rowCount === 0) {
					logger.warn(
						`Password reset failed: User not found for email: ${email}`
					); // Log when user is not found
					return res.status(404).json({ message: 'User not found.' });
				}

				const user = userResult.rows[0];
				await handlePasswordReset(user);

				res.status(200).json({
					message: 'Password reset email sent',
				});
			} catch (error) {
				logger.error(
					`Failed to process password reset for email: ${email}. Error: ${error.message}`
				); // Log any exceptions
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

			logger.info(`Password reset process initiated with token: ${token}`);

			try {
				const userQuery = `
        SELECT * FROM users 
        WHERE reset_token = $1 AND reset_token_expiration > NOW()
      `;
				const userResult = await pool.query(userQuery, [token]);

				if (userResult.rowCount === 0) {
					// Log when the token is invalid or has expired
					logger.warn(
						`Password reset failed: Token is invalid or has expired. Token: ${token}`
					);
					return res
						.status(400)
						.json({ message: 'Token is invalid or has expired.' });
				}

				const user = userResult.rows[0];

				// Hash new password and update user document
				const hashedPassword = await bcrypt.hash(newPassword, 12);
				const updateQuery = `
        UPDATE users 
        SET password = $1, reset_token = NULL, reset_token_expiration = NULL, reset_token_force_flag = NULL
        WHERE user_id = $2
      `;
				await pool.query(updateQuery, [hashedPassword, user.user_id]);

				// Log successful password reset
				logger.info(`Password successfully reset for user: ${user.user_id}`);
				res.status(200).json({ message: 'Password has been reset.' });
			} catch (error) {
				// Log any exceptions that occur during the password reset process
				logger.error(
					`An error occurred during the password reset process. Token: ${token}, Error: ${error.message}`
				);
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
		// Log the user's attempt to log out
		logger.info('User logout initiated');

		res.clearCookie('token');
		res.status(200).json({ message: 'Logged out successfully' });

		// Log the successful logout
		logger.info('User logged out successfully');
	});

	/**
	 * Route handler for checking the user's authentication status. Requires authentication.
	 * Verifies the user's authentication and returns their login status, user user_id, and admin status.
	 * Responds with a 200 status code and the authentication status.
	 * On failure, such as if the user is not found, responds with an appropriate error message and status code.
	 */

	router.get('/status', authenticateToken, async (req, res) => {
		try {
			// Log the attempt to check user's authentication status
			logger.info(
				`Checking authentication status for userId: ${req.user.userId}`
			);

			const userQuery = 'SELECT is_admin FROM users WHERE user_id = $1';
			const userResult = await pool.query(userQuery, [req.user.userId]);
			if (userResult.rowCount === 0) {
				// Log if the user is not found
				logger.warn(
					`User not found during authentication status check for userId: ${req.user.userId}`
				);
				return res.status(404).json({ message: 'User not found.' });
			}

			const user = userResult.rows[0];

			res.status(200).json({
				isLoggedIn: true,
				userId: req.user.userId,
				isAdmin: user.is_admin,
			});

			// Log the successful authentication status check
			logger.info(
				`Authentication status checked successfully for userId: ${req.user.userId}`
			);
		} catch (error) {
			// Log any errors during the authentication status check
			logger.error(
				`Error checking authentication status for userId: ${req.user.userId}. Error: ${error.message}`
			);
			Sentry.captureException(error);
			res.status(500).json({ message: 'Error checking user status.' });
		}
	});

	router.get('/my-rescue', authenticateToken, async (req, res) => {
		const userId = req.user.userId;

		logger.info(`Fetching rescue organization for user ${userId}`);

		try {
			// Updated query to include permissions from the staff_members table
			const rescueQuery = `
            SELECT r.*, u.email AS staff_email, sm.permissions, sm.verified_by_rescue, u.user_id
			FROM rescues r
			JOIN staff_members sm ON sm.rescue_id = r.rescue_id
			JOIN users u ON u.user_id = sm.user_id
			WHERE r.rescue_id IN (
				SELECT rescue_id
				FROM staff_members
				WHERE user_id = $1
			)

        `;
			const rescueResult = await pool.query(rescueQuery, [userId]);
			if (rescueResult.rowCount === 0) {
				logger.warn(
					`User ${userId} is not a staff member of any rescue organization`
				);
				return res.status(404).send({
					message: 'User is not a staff member of any rescue organization',
				});
			}

			const rescue = rescueResult.rows[0];

			logger.info(
				`Rescue organization fetched successfully for user ${userId}`
			);
			const responseData = {
				rescue_id: rescue.rescue_id,
				rescueName: rescue.rescue_name,
				// addressLine1: rescue.address_line_1,
				// addressLine2: rescue.address_line_2,
				city: rescue.city,
				// county: rescue.county,
				// postcode: rescue.postcode,
				country: rescue.country,
				rescueType: rescue.rescue_type,
				referenceNumber: rescue.reference_number,
				referenceNumberVerified: rescue.reference_number_verified,
				staff: rescueResult.rows.map((row) => ({
					userId: row.user_id,
					email: row.staff_email,
					permissions: row.permissions,
					verifiedByRescue: row.verified_by_rescue,
				})),
			};

			// console.log(rescueResult.rows);

			res.json(responseData);
		} catch (error) {
			Sentry.captureException(error);
			logger.error(
				`Failed to fetch rescue organization for user ${userId}: ${error}`
			);
			res.status(500).send({
				message: 'An error occurred while fetching the rescue organization',
				error: error.message,
			});
		}
	});

	router.get('/permissions', authenticateToken, async (req, res) => {
		const userId = req.user.userId; // Extract userId from the token
		logger.info(`Fetching permissions for userId: ${userId}`); // Log the operation

		try {
			// Query the database to find permissions for this user in the staff_members table
			const permissionsQuery = `
            SELECT s.permissions
            FROM staff_members s
            WHERE s.user_id = $1
        `;
			const permissionsResult = await pool.query(permissionsQuery, [userId]);
			if (permissionsResult.rowCount === 0) {
				logger.warn(
					`User ${userId} is not a staff member of any rescue organization`
				);
				return res.status(404).json({
					message: 'User is not a staff member of any rescue organization.',
				});
			}

			// Extracting the permissions array from the first row (assuming one entry per user)
			const permissions = permissionsResult.rows[0].permissions;

			logger.info(`Permissions fetched successfully for userId: ${userId}`);
			res.status(200).json({ permissions });
		} catch (error) {
			logger.error(
				`Error fetching permissions for userId: ${userId}: ${error.message}`
			); // Log any exceptions
			Sentry.captureException(error);
			res.status(500).json({ message: 'Failed to fetch permissions.' });
		}
	});

	// Return the configured router.
	return router;
}
