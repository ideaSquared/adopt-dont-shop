import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../dbConnection.js';
import app from '../../index.js'; // Import your Express application
import geoService from '../../services/geoService.js';
import { sendEmailVerificationEmail } from '../../services/emailService.js';

const request = supertest(app);

describe('POST /api/auth/register', () => {
	let sandbox;

	beforeEach(() => {
		// Create a sandbox for stubbing
		sandbox = sinon.createSandbox();

		// Stubbing the necessary external calls
		sandbox.stub(pool, 'query');
		sandbox.stub(bcrypt, 'hash');
		sandbox.stub(geoService, 'getGeocodePoint');
		// When stubbing this, it looks like it isn't torn down properly and causing a "before each hook" error. It's not important to call.
		// sandbox.stub(sendEmailVerificationEmail);
	});

	afterEach(() => {
		// Restore all the stubs
		sandbox.restore();
	});

	it('should respond with 500 if geocoding fails', async () => {
		pool.query.resolves({ rowCount: 0, rows: [] });
		bcrypt.hash.resolves('hashedpassword');
		geoService.getGeocodePoint.rejects(new Error('Geocoding service down'));

		const response = await request.post('/api/auth/register').send({
			email: 'user@example.com',
			password: 'password123',
			firstName: 'John',
			lastName: 'Doe',
			city: 'Unknown City',
			country: 'Unknown Country',
		});

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'Geocoding failed, unable to register user.'
		);
	});

	it('should create user and respond with 201 on successful registration', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 0, rows: [] }); // No existing user
		bcrypt.hash.resolves('hashedpassword');
		geoService.getGeocodePoint.resolves({ x: 40.7128, y: -74.006 });
		pool.query.onSecondCall().resolves({ rows: [{ user_id: 1 }] });

		const response = await request.post('/api/auth/register').send({
			email: 'newuser@example.com',
			password: 'password123',
			firstName: 'John',
			lastName: 'Doe',
			city: 'New York',
			country: 'USA',
		});

		expect(response.status).to.equal(201);
		expect(response.body.message).to.equal('User created!');
		expect(response.body.userId).to.be.a('number');
	});

	it('should respond with 409 if user already exists', async () => {
		pool.query.resolves({ rowCount: 1, rows: [] });

		const response = await request.post('/api/auth/register').send({
			email: 'existing@example.com',
			password: 'password123',
			firstName: 'John',
			lastName: 'Doe',
			city: 'City',
			country: 'Country',
		});

		expect(response.status).to.equal(409);
		expect(response.body.message).to.equal(
			'User already exists - please try login or reset password'
		);
	});

	// More tests could include scenarios such as handling unexpected exceptions, checking the format of the location point, etc.
});
