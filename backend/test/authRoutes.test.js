// Import the necessary modules for testing
import request from 'supertest';
import app from '../index.js'; // Adjust the path to your Express app
import { pool } from '../dbConnection.js'; // Adjust the path to your database pool
import bcrypt from 'bcryptjs';
import { generateResetToken } from '../utils/tokenGenerator';
import { sendEmailVerificationEmail } from '../services/emailService';
import jest from 'jest';

// Mock the necessary modules to isolate the testing environment
jest.mock('../dbConnection.js'); // Mock the database connection
jest.mock('bcryptjs'); // Mock bcrypt for password hashing
jest.mock('../utils/tokenGenerator'); // Mock the token generator utility
jest.mock('../services/emailService'); // Mock the email service

describe('/api/auth/register route', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should reject invalid request data', async () => {
		const response = await request(app)
			.post('/api/auth/register')
			.send({ email: 'invalid-email', password: 'short' });

		expect(response.status).toBe(400);
		expect(response.body).toEqual({ message: 'Invalid request data' }); // Assuming your validation middleware handles errors like this
	});

	it('should return 409 if user already exists', async () => {
		pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Simulate existing user
		const response = await request(app).post('/api/auth/register').send({
			email: 'test@example.com',
			password: 'password123',
			firstName: 'Test',
		});

		expect(response.status).toBe(409);
		expect(response.body).toEqual({
			message: 'User already exists - please try login or reset password',
		});
	});

	it('should create a new user and send verification email if user does not exist', async () => {
		pool.query
			.mockResolvedValueOnce({ rowCount: 0 }) // No existing user
			.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // Simulate user creation
		bcrypt.hash.mockResolvedValue('hashedPassword');
		generateResetToken.mockResolvedValue('token123');
		sendEmailVerificationEmail.mockResolvedValue();

		const response = await request(app).post('/api/auth/register').send({
			email: 'test@example.com',
			password: 'password123',
			firstName: 'Test',
		});

		expect(response.status).toBe(201);
		expect(response.body).toEqual({ message: 'User created!', userId: 1 });
		expect(pool.query).toHaveBeenCalledWith(expect.anything(), [
			'test@example.com',
			'hashedPassword',
			'Test',
			false,
			'token123',
		]);
		expect(sendEmailVerificationEmail).toHaveBeenCalledWith(
			'test@example.com',
			expect.anything()
		);
	});

	it('should handle unexpected errors', async () => {
		pool.query.mockRejectedValue(new Error('Database failure'));
		const response = await request(app).post('/api/auth/register').send({
			email: 'test@example.com',
			password: 'password123',
			firstName: 'Test',
		});

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ message: 'Creating user failed.' });
	});
});
