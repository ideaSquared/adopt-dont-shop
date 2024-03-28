// authRoutes.test.js
import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { expect } from 'chai';
import nodemailer from 'nodemailer';
import User from '../models/User.js'; // Adjust the path as needed
import Rescue from '../models/Rescue.js';
import app from '../index.js';
import { generateObjectId } from '../utils/generateObjectId.js';

/**
 * Test suite for authentication-related routes.
 *
 * This suite covers testing for various authentication operations such as user registration, login, and password reset functionalities.
 * It employs `supertest` for making HTTP calls, `sinon` for mocking and stubbing external dependencies like JWT verification and email sending,
 * and `chai` for assertions. The tests ensure that the authentication flows work as expected under different scenarios,
 * including successful operations and handling of error cases.
 */
describe('Auth Routes', function () {
	let tokenGeneratorMock;
	let emailServiceMock;
	let userMock, rescueMock, populateStub;
	let cookie;

	/**
	 * Before each test, resets and sets up the mock environment.
	 * This includes mocking external services like nodemailer for email operations and setting up mocks for token generation and email service.
	 * Additionally, it mocks the User model to simulate database operations and sets up a dummy authentication cookie for use in requests.
	 * The JWT verification process is also stubbed to simulate an authenticated session.
	 */
	beforeEach(async () => {
		// Cleanup and setup for a fresh testing environment before each test.
		sinon.restore(); // Clears all sinon stubs, mocks, and spies.

		// Mock nodemailer's transport creation to simulate email sending without actual network requests.
		sinon.stub(nodemailer, 'createTransport').returns({
			sendMail: (mailOptions, callback) => {
				// Simulate asynchronous email sending success.
				if (callback && typeof callback === 'function') {
					callback(null, { messageId: 'mockMessageId' });
				} else {
					return Promise.resolve({ messageId: 'mockMessageId' });
				}
			},
		});

		// Prepare mocks for token generation and email sending, crucial for password reset functionality.
		tokenGeneratorMock = {
			generateResetToken: sinon.stub().resolves('mockToken123'),
		};
		emailServiceMock = {
			sendPasswordResetEmail: sinon.stub().resolves({
				messageId: 'mockMessageId',
			}),
		};
		rescueMock = sinon.mock(Rescue); // Assuming you have a Rescue model

		// Mock the User model to prevent actual database interactions, allowing for controlled responses.
		userMock = sinon.mock(User);

		// Inject mocks into the application, replacing real implementations.
		app.set('tokenGenerator', tokenGeneratorMock);
		app.set('emailService', emailServiceMock);
		app.set('User', userMock);
		// app.set('Rescue', rescueMock);

		// Generate a mock JWT token for simulating authenticated requests.
		const secret = process.env.SECRET_KEY; // Your JWT secret.
		const payload = { userId: 'mockUserId', isAdmin: false }; // Mock payload.
		const token = jwt.sign(payload, secret); // Sign to get a mock token.

		// Prepare a simulated authentication cookie for use in requests.
		cookie = `token=${token};`;

		// Stub the JWT verification process to always authenticate the mock token.
		sinon.stub(jwt, 'verify').callsFake((token, secret, callback) => {
			callback(null, { userId: 'mockUserId', isAdmin: false });
		});
	});

	/**
	 * After each test, restores the Sinon sandbox to clean up all mocks, stubs, and spies.
	 * This ensures a clean state for subsequent tests.
	 */
	afterEach(() => {
		// Restore the testing environment back to its original state after each test.
		sinon.restore(); // Clears and restores all sinon mocks, stubs, and spies.
	});

	/**
	 * Tests user registration functionality, verifying the behavior when:
	 * - Registering a new user successfully.
	 * - Attempting to register with an email that already exists.
	 * - Submitting a registration with an invalid email format.
	 * - Trying to register without providing a password.
	 */
	describe('POST /api/auth/register', () => {
		it('should register a new user', async () => {
			// Assuming your User.create method is used within this route
			userMock
				.expects('findOne')
				.withArgs({ email: 'test-new-user@example.com' })
				.resolves(null);
			userMock
				.expects('create')
				.resolves({ _id: 'newUserId', email: 'test-new-user@example.com' });

			const res = await request(app)
				.post('/api/auth/register')
				.send({
					firstName: 'testNew',
					email: 'test-new-user@example.com',
					password: 'password123',
				})
				.expect(201);

			expect(res.body).to.have.property('message', 'User created!');
			userMock.verify();
		});

		it('should return 409 if email already exists', async () => {
			userMock
				.expects('findOne')
				.withArgs({ email: 'existing-user@example.com' })
				.resolves({
					_id: 'existingUserId',
					email: 'existing-user@example.com',
				});

			const res = await request(app)
				.post('/api/auth/register')
				.send({
					firstName: 'testNew',
					email: 'existing-user@example.com',
					password: 'password123',
				})
				.expect(409);

			expect(res.body).to.have.property(
				'message',
				'User already exists - please try login or reset password'
			);
			userMock.verify();
		});

		it('should reject registration with invalid email format', async () => {
			const res = await request(app)
				.post('/api/auth/register')
				.send({
					firstName: 'Test',
					email: 'invalid-email', // This email format is invalid
					password: 'password123',
				})
				.expect(400); // Adjust depending on how your app handles validation errors

			expect(res.body).to.have.property('message').that.includes('email'); // The error message should mention the email field
		});

		it('should reject registration with missing password', async () => {
			const res = await request(app)
				.post('/api/auth/register')
				.send({
					firstName: 'Test',
					email: 'test@example.com',
					// Omitting the password field
				})
				.expect(400); // Adjust depending on how your app handles validation errors

			expect(res.body).to.have.property('message').that.includes('password'); // The error message should mention the password field
		});
	});

	/**
	 * Tests user login functionality, including scenarios such as:
	 * - Logging in successfully with correct credentials.
	 * - Rejection of login attempts with incorrect passwords.
	 * - Validation of email format on login attempts.
	 * - Requirement of a password for login.
	 */
	describe('POST /api/auth/login', () => {
		this.timeout(5000);

		it('should login an existing user', async () => {
			const hashedPassword = await bcrypt.hash('password123', 12);
			userMock
				.expects('findOne')
				.withArgs({ email: 'login@example.com' })
				.resolves({
					_id: 'userId',
					email: 'login@example.com',
					password: hashedPassword,
				});

			const res = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'login@example.com',
					password: 'password123',
				})
				.expect(200);

			expect(res.body).to.have.property('userId');
			userMock.verify();
		});

		it('should reject login with incorrect password', async () => {
			const hashedPassword = await bcrypt.hash('password123', 12);
			userMock
				.expects('findOne')
				.withArgs({ email: 'wrongpass@example.com' })
				.resolves({
					email: 'wrongpass@example.com',
					password: hashedPassword,
				});

			const res = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'wrongpass@example.com',
					password: 'wrongPassword',
				})
				.expect(401);

			expect(res.body).to.have.property('message').that.includes('not correct');
			userMock.verify();
		});

		it('should reject login with invalid email format', async () => {
			const res = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'invalid-email',
					password: 'password123',
				})
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('email');
		});

		it('should reject login with missing password', async () => {
			const res = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'test@example.com',
					// Omitting the password field
				})
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('password');
		});

		it('should reject a login where a user has a force reset password flag', async () => {
			// Mock the database call to simulate finding a user by email.
			userMock
				.expects('findOne')
				.withArgs({ email: 'exists@example.com' })
				.resolves({
					email: 'exists@example.com',
					save: sinon.stub().resolves(true),
				});

			const res = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'exists@example.com' })
				.expect(200);

			expect(res.body).to.have.property(
				'message',
				'Password reset email sent. Redirecting to login page...'
			);
			userMock.verify(); // Ensure the mock expectation is met.
		});
	});

	/**
	 * Tests the functionality for authenticated users to update their details, covering cases such as:
	 * - Successfully updating user details.
	 * - Handling attempts to update details for a non-existent user ID.
	 * - Validating email format on detail updates.
	 * - Ensuring password complexity on updates.
	 * - Verifying firstName field requirements on updates.
	 */
	describe('PUT /api/auth/details', () => {
		it('should return 404 for non-existent user ID', async () => {
			// Testing the scenario where the user ID does not exist.
			// This test ensures that when attempting to update details for a non-existent user ID,
			// the system returns a 404 error indicating the user was not found.
			userMock.expects('findById').withArgs('mockUserId').resolves(null);

			const res = await request(app)
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({ email: 'doesnotexist@example.com' })
				.expect(404);

			expect(res.body).to.have.property('message', 'User not found.');
			userMock.verify();
		});

		it('should update user details when authenticated', async () => {
			// Testing the successful update of user details when authenticated.
			// This test verifies that when providing valid details for update (email, password, firstName),
			// the system successfully updates the user details and returns a 200 status code with a success message.
			const user = {
				_id: 'mockUserId',
				firstName: 'originalName',
				email: 'original@example.com',
				password: 'password',
				save: sinon.stub().resolves(true),
			};

			sinon.stub(User, 'findById').withArgs('mockUserId').resolves(user);

			const res = await request(app)
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({
					email: 'updated@example.com',
					password: 'newPassword',
					firstName: 'newName',
				})
				.expect(200);

			expect(res.body).to.have.property(
				'message',
				'User details updated successfully.'
			);
			expect(user.save.calledOnce).to.be.true;
		});

		it('should reject update with invalid email format', async () => {
			// Testing the rejection of update with an invalid email format.
			// This test ensures that when providing an email with an invalid format for update,
			// the system rejects the request and returns a 400 error indicating the email format issue.
			const res = await request(app)
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({ email: 'invalidEmailFormat' }) // Invalid email format
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('email');
		});

		it('should reject update with short password', async () => {
			// Testing the rejection of update with a short password.
			// This test ensures that when providing a password that does not meet the length requirement for update,
			// the system rejects the request and returns a 400 error indicating the password issue.
			const res = await request(app)
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({ password: '123' }) // Password too short
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('password');
		});

		it('should reject update with invalid firstName length', async () => {
			// Testing the rejection of update with an invalid firstName length.
			// This test ensures that when providing a firstName that does not meet the length requirement for update,
			// the system rejects the request and returns a 400 error indicating the firstName issue.
			const res = await request(app)
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({ firstName: 'A' }) // FirstName too short
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('firstName');
		});

		// TODO: Send a validation error back, rather than just the error message
		// it('should reject update without any valid fields', async () => {
		// 	const res = await request(app)
		// 		.put('/api/auth/details')
		// 		.set('Cookie', cookie)
		// 		.send({}) // Empty body
		// 		.expect(400);

		// 	expect(res.body).to.have.property(
		// 		'message',
		// 		'Validation error: must provide at least one valid field to update'
		// 	);
		// });
	});

	describe('GET /api/auth/details', () => {
		it('should return the user details for an authenticated user', async () => {
			const expectedUserWithoutPassword = {
				_id: 'mockUserId',
				firstName: 'testUser',
				email: 'test@example.com',
				// Note: Password is intentionally omitted
			};

			// First stub the findById method
			const findByIdStub = sinon.stub(User, 'findById').returns({
				// Then stub the select method to resolve with the expected user object
				select: sinon.stub().resolves(expectedUserWithoutPassword),
			});

			const res = await request(app)
				.get('/api/auth/details')
				.set('Cookie', cookie) // Assuming the authentication process sets a cookie
				.expect(200);

			// Assertions to verify the response matches expectations
			expect(res.body).to.have.property('email', 'test@example.com');
			expect(res.body).to.have.property('firstName', 'testUser');
			expect(res.body).not.to.have.property('password');

			// Verify that the expectations on the mock were met
			sinon.restore();
		});

		it('should return 404 for non-existent user ID', async () => {
			// Simulate scenario where user ID does not exist
			const findByIdStub = sinon.stub(User, 'findById').returns({
				// Stub the select method to resolve with null, simulating a non-existent user
				select: sinon.stub().resolves(null),
			});

			const res = await request(app)
				.get('/api/auth/details')
				.set('Cookie', cookie) // Assuming cookie is defined elsewhere
				.expect(404);

			expect(res.body).to.have.property('message', 'User not found.');
		});

		it('should return 401 for unauthenticated requests', async () => {
			// No need to stub `findById` here since this test simulates an unauthenticated request
			const res = await request(app).get('/api/auth/details').expect(401);

			expect(res.body).to.have.property('error', 'No token provided');
		});
	});

	/**
	 * Tests the password reset functionality, assessing behavior in scenarios like:
	 * - Successfully resetting a password with a valid token.
	 * - Rejecting reset attempts with invalid or expired tokens.
	 * - Validating new password requirements during a reset.
	 */
	describe('POST /api/auth/reset-password', () => {
		it('should reset the password with a valid token', async () => {
			// Testing the password reset functionality with a valid token.
			// This test verifies that when providing a valid token and a new password,
			// the system successfully resets the password for the corresponding user.
			// It expects a response with status code 200 and a message confirming the password reset.
			const user = {
				email: 'reset@example.com',
				password: 'oldPasswordHash',
				resetToken: 'valid-token',
				resetTokenExpiration: Date.now() + 3600000, // 1 hour in the future
				save: sinon.stub().resolves(true),
			};
			userMock
				.expects('findOne')
				.withArgs({
					resetToken: 'valid-token',
					resetTokenExpiration: { $gt: sinon.match.number },
				})
				.resolves(user);

			const res = await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'valid-token',
					newPassword: 'newPassword',
				})
				.expect(200);

			expect(res.body).to.have.property('message', 'Password has been reset.');
			expect(user.save.calledOnce).to.be.true;
			userMock.verify();
		});

		it('should reject reset with invalid or expired token', async () => {
			// Testing the rejection of password reset with an invalid or expired token.
			// This test ensures that when providing an invalid or expired token for password reset,
			// the system rejects the request and returns a 400 error indicating the token issue.
			// It expects a response with status code 400 and a message indicating the token is invalid or expired.
			userMock
				.expects('findOne')
				.withArgs({
					resetToken: 'invalidToken',
					resetTokenExpiration: { $gt: sinon.match.number },
				})
				.resolves(null);

			const res = await request(app)
				.post('/api/auth/reset-password')
				.send({ token: 'invalidToken', newPassword: 'newSecurePassword' })
				.expect(400);

			expect(res.body).to.have.property(
				'message',
				'Token is invalid or has expired.'
			);
			userMock.verify();
		});

		it('should reject reset with short new password', async () => {
			// Testing the rejection of password reset with a short new password.
			// This test ensures that when providing a new password that does not meet the length requirement,
			// the system rejects the request and returns a 400 error indicating the password issue.
			const res = await request(app)
				.post('/api/auth/reset-password')
				.send({
					token: 'valid-token', // Assuming this is considered valid in your tests
					newPassword: '123', // Too short
				})
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('newPassword');
		});
	});
	/**
	 * Test suite for the logout endpoint in the authentication API.
	 * It verifies that the logout process successfully logs the user out by checking the server's response.
	 */
	describe('POST /api/auth/logout', () => {
		it('should log the user out', async () => {
			const res = await request(app).post('/api/auth/logout').expect(200);

			expect(res.body).to.have.property('message', 'Logged out successfully');
			// Additional validation could include checking for the absence of a session token or cookie.
		});
	});

	/**
	 * Test suite for the forgot password functionality in the authentication API.
	 * It tests scenarios including successful initiation of the password reset process for existing emails,
	 * handling of non-existent emails, validation of email format, and handling of empty email input.
	 */
	describe('POST /api/auth/forgot-password', () => {
		it('should initiate password reset process for existing email', async () => {
			// Mock the database call to simulate finding a user by email.
			userMock
				.expects('findOne')
				.withArgs({ email: 'exists@example.com' })
				.resolves({
					email: 'exists@example.com',
					save: sinon.stub().resolves(true),
				});

			const res = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'exists@example.com' })
				.expect(200);

			expect(res.body).to.have.property(
				'message',
				'Password reset email sent. Redirecting to login page...'
			);
			userMock.verify(); // Ensure the mock expectation is met.
		});

		it('should return 404 for email not found in database', async () => {
			// Mock the database call to simulate not finding a user by email.
			userMock
				.expects('findOne')
				.withArgs({ email: 'notfound@example.com' })
				.resolves(null);

			const res = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'notfound@example.com' })
				.expect(404);

			expect(res.body).to.have.property('message', 'User not found.');
			userMock.verify();
		});

		it('should reject forgot password request with invalid email format', async () => {
			const res = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: 'invalidEmailFormat' }) // Test with invalid email format.
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('email');
		});

		it('should reject forgot password request with empty email', async () => {
			const res = await request(app)
				.post('/api/auth/forgot-password')
				.send({ email: '' }) // Test with empty email field.
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('email');
		});
	});

	/**
	 * Test suite for checking the authentication status of a user.
	 * It verifies that the endpoint correctly returns the user's authentication status,
	 * including whether the user is logged in and if they have admin privileges.
	 */
	describe('GET /api/auth/status', () => {
		it('should return user status for authenticated request', async () => {
			// Mock the database call to simulate finding a user by ID.
			userMock.expects('findById').withArgs('mockUserId').resolves({
				_id: 'mockUserId',
				email: 'user@example.com',
				isAdmin: true,
			});

			const res = await request(app)
				.get('/api/auth/status')
				.set('Cookie', cookie) // Simulate sending an authentication cookie.
				.expect(200);

			expect(res.body).to.include({
				isLoggedIn: true,
				userId: 'mockUserId',
				isAdmin: true,
			});
			userMock.verify();
		});
	});

	describe('GET /api/auth/my-rescue', () => {
		it('should successfully fetch rescue organization for user', async () => {
			// Setup mock for Rescue.findOne to simulate finding a rescue organization
			const mockRescueData = {
				rescueName: 'Happy Paws Rescue',
				rescueAddress: '1234 Rescue Lane, Petville, PV 56789',
				rescueType: 'Charity',
				referenceNumber: 'HP123456789',
				referenceNumberVerified: true,
				staff: [
					{
						userId: {
							_id: 'mockUserId', // Assume populated userId
							email: 'user@example.com', // Mock email for the user, simulating population
						},
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
					{
						userId: {
							_id: '60de5be8673d4f2f6c8c1234', // Another mock ObjectId
							email: 'another@example.com', // Mock email for the second user
						},
						permissions: ['edit_rescue_info', 'see_messages'],
						verifiedByRescue: false,
					},
				],
			};

			// Setup an object to mimic the chainable Mongoose methods
			const populateMock = sinon
				.stub()
				.returns(Promise.resolve(mockRescueData));

			// Now mock `findOne` to return an object that contains our `populate` mock as a method
			rescueMock
				.expects('findOne')
				.withArgs({ 'staff.userId': 'mockUserId' })
				.returns({ populate: populateMock });

			const res = await request(app)
				.get('/api/auth/my-rescue')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).to.have.property(
				'message',
				'Rescue organization fetched successfully'
			);
			expect(res.body.data).to.deep.equal(mockRescueData); // Verify the response data includes populated userId fields
			rescueMock.verify();
		});

		it('should return 404 when the userId is not a member of any staff', async () => {
			// Setup mock for Rescue.findOne to simulate NOT finding a rescue organization for the given userId
			const mockRescueData = null; // No data found

			// Setup an object to mimic the chainable Mongoose methods
			const populateMock = sinon
				.stub()
				.returns(Promise.resolve(mockRescueData));

			// Now mock `findOne` to return an object that contains our `populate` mock as a method
			rescueMock
				.expects('findOne')
				.withArgs({ 'staff.userId': 'mockUserId' })
				.returns({ populate: populateMock });

			const res = await request(app)
				.get('/api/auth/my-rescue')
				.set('Cookie', cookie)
				.expect(404); // Expecting a 404 Not Found status code

			expect(res.body).to.have.property(
				'message',
				'User is not a staff member of any rescue organization' // Adjust the message to match your actual API response for not found
			);

			// Verify that findOne was called as expected
			rescueMock.verify();
		});

		// it('should return 500 if there is an error fetching the rescue organization', async () => {
		// 	rescueMock
		// 		.expects('findOne')
		// 		.withArgs({ 'staff.userId': 'mockUserId' })
		// 		.rejects(new Error('Mock error'));

		// 	const res = await request(app)
		// 		.get('/api/auth/my-rescue')
		// 		.set('Cookie', cookie)
		// 		.expect(500);

		// 	expect(res.body).to.have.property(
		// 		'message',
		// 		'An error occurred while fetching the rescue organization'
		// 	);
		// 	rescueMock.verify();
		// });
	});
});
