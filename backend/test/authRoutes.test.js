import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { expect } from 'chai';
import nodemailer from 'nodemailer';
import User from '../models/User.js'; // Adjust the path as needed
import app from '../index.js';

describe('Auth Routes', function () {
	let tokenGeneratorMock;
	let emailServiceMock;
	let userMock;
	let cookie;

	beforeEach(async () => {
		// Clean up Sinon environment
		sinon.restore();

		// Setup nodemailer stub
		sinon.stub(nodemailer, 'createTransport').returns({
			sendMail: (mailOptions, callback) => {
				// Check if a callback function is provided
				if (callback && typeof callback === 'function') {
					callback(null, { messageId: 'mockMessageId' }); // Simulate successful email sending
				} else {
					// If no callback is provided, return a promise
					return Promise.resolve({ messageId: 'mockMessageId' });
				}
			},
		});

		// Setup tokenGenerator and emailService mocks
		tokenGeneratorMock = {
			generateResetToken: sinon.stub().resolves('mockToken123'),
		};
		emailServiceMock = {
			sendPasswordResetEmail: sinon.stub().resolves({
				messageId: 'mockMessageId',
			}),
		};

		// Stub User model methods
		userMock = sinon.mock(User);

		// Replace actual dependencies with mocks/stubs
		app.set('tokenGenerator', tokenGeneratorMock);
		app.set('emailService', emailServiceMock);
		app.set('User', userMock);

		const secret = process.env.SECRET_KEY; // Replace with your actual secret key
		const payload = { userId: 'mockUserId', isAdmin: false };
		const token = jwt.sign(payload, secret);

		cookie = `token=${token};`; // Prepare the cookie with the valid JWT token

		// Setup JWT verification stub
		sinon.stub(jwt, 'verify').callsFake((token, secret, callback) => {
			callback(null, { userId: 'mockUserId', isAdmin: false }); // Adjust the payload as needed
		});
	});

	afterEach(() => {
		// Restore all stubs, mocks, and spies
		sinon.restore();
	});

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
	});

	describe('POST /api/auth/login', () => {
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
	});

	describe('PUT /api/auth/details', () => {
		it('should return 404 for non-existent user ID', async () => {
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
			const user = {
				_id: 'mockUserId',
				email: 'original@example.com',
				password: 'password',
				save: sinon.stub().resolves(true),
			};

			sinon.stub(User, 'findById').withArgs('mockUserId').resolves(user);

			const res = await request(app)
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({ email: 'updated@example.com', password: 'newPassword' })
				.expect(200);

			expect(res.body).to.have.property(
				'message',
				'User details updated successfully.'
			);
			expect(user.save.calledOnce).to.be.true;
		});
	});

	describe('POST /api/auth/reset-password', () => {
		it('should reset the password with a valid token', async () => {
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
	});

	describe('POST /api/auth/logout', () => {
		it('should log the user out', async () => {
			const res = await request(app).post('/api/auth/logout').expect(200);

			expect(res.body).to.have.property('message', 'Logged out successfully');
			// Additional checks for cookie clearing can be done if needed
		});
	});

	describe('POST /api/auth/forgot-password', () => {
		it('should initiate password reset process for existing email', async () => {
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
			userMock.verify();
		});

		it('should return 404 for email not found in database', async () => {
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
	});

	describe('GET /api/auth/status', () => {
		it('should return user status for authenticated request', async () => {
			userMock.expects('findById').withArgs('mockUserId').resolves({
				_id: 'mockUserId',
				email: 'user@example.com',
				isAdmin: true,
			});

			const res = await request(app)
				.get('/api/auth/status')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).to.include({
				isLoggedIn: true,
				userId: 'mockUserId',
				isAdmin: true,
			});
			userMock.verify();
		});
	});
});
