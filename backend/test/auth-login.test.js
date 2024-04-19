import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../dbConnection.js';
import app from '../index.js'; // Import your Express application

const request = supertest(app);

describe('POST /api/auth/login', () => {
	let sandbox;

	beforeEach(() => {
		// Create a sandbox for stubbing
		sandbox = sinon.createSandbox();

		// Stubbing the necessary external calls
		sandbox.stub(pool, 'query');
		sandbox.stub(bcrypt, 'compare');
		sandbox.stub(jwt, 'sign');
	});

	afterEach(() => {
		// Restore all the stubs
		sandbox.restore();
	});

	it('should respond with 401 if user does not exist', async () => {
		pool.query.resolves({ rowCount: 0, rows: [] });

		const response = await request
			.post('/api/auth/login')
			.send({ email: 'nonexistent@example.com', password: 'password123' });

		expect(response.status).to.equal(401);
		expect(response.body.message).to.equal(
			'Email does not exist or password is not correct.'
		);
	});

	it('should respond with 401 if password is incorrect', async () => {
		pool.query.resolves({
			rowCount: 1,
			rows: [{ email: 'user@example.com', password: 'hashedpassword' }],
		});
		bcrypt.compare.resolves(false);

		const response = await request
			.post('/api/auth/login')
			.send({ email: 'user@example.com', password: 'wrongpassword' });

		expect(response.status).to.equal(401);
		expect(response.body.message).to.equal(
			'Email does not exist or password is not correct.'
		);
	});

	it('should respond with 403 if email is not verified', async () => {
		pool.query.resolves({
			rowCount: 1,
			rows: [
				{
					email: 'user@example.com',
					password: 'hashedpassword',
					email_verified: false,
				},
			],
		});
		bcrypt.compare.resolves(true);

		const response = await request
			.post('/api/auth/login')
			.send({ email: 'user@example.com', password: 'correctpassword' });

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Email is not verified. Please verify your email before logging in.'
		);
	});

	it('should respond with 200 and set a cookie if login is successful', async () => {
		pool.query.resolves({
			rowCount: 1,
			rows: [
				{
					user_id: 1,
					is_admin: false,
					password: 'hashedpassword',
					email_verified: true,
				},
			],
		});
		bcrypt.compare.resolves(true);
		jwt.sign.returns('fake-jwt-token');

		const response = await request
			.post('/api/auth/login')
			.send({ email: 'user@example.com', password: 'correctpassword' });

		expect(response.status).to.equal(200);
		expect(response.body.userId).to.equal(1);
		expect(response.body.isAdmin).to.be.false;
		expect(response.headers['set-cookie']).to.exist;
	});
});
