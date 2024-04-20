import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../dbConnection.js';
import app from '../../index.js'; // Import your Express application
import { geoService } from '../../services/geoService.js'; // Assuming you have this service
const request = supertest(app);

describe('User Details Routes', () => {
	let sandbox, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		sandbox.stub(bcrypt, 'hash');
		sandbox.stub(geoService, 'getGeocodePoint');

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

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	describe('PUT /api/auth/details', () => {
		it('should update user details and respond with 200', async () => {
			bcrypt.hash.resolves('hashedPassword');
			pool.query.onFirstCall().resolves({ rowCount: 1 }); // User exists
			pool.query.onSecondCall().resolves(); // Update successful

			const response = await request
				.put('/api/auth/details')
				.set('Cookie', cookie)
				.send({
					email: 'new@example.com',
					password: 'newpassword',
					firstName: 'NewFirstName',
					lastName: 'NewLastName',
					city: 'New City',
					country: 'New Country',
				});

			expect(response.status).to.equal(200);
			expect(response.body.message).to.equal(
				'User details updated successfully.'
			);
		});

		it('should return 404 if user not found', async () => {
			// Setup a request that meets all validation requirements
			const validRequestData = {
				email: 'test@example.com',
				password: 'password123',
				firstName: 'John',
				lastName: 'Doe', // Required field based on your log
				city: 'Cityname',
				country: 'Countryname',
			};

			pool.query.resolves({ rowCount: 0 }); // Simulate no user found in the database

			const response = await request
				.put('/api/auth/details')
				.send(validRequestData) // Include all required data to pass validation
				.set('Cookie', cookie);

			expect(response.status).to.equal(404);
			expect(response.body.message).to.equal('User not found.');
		});
	});

	describe('GET /api/auth/details', () => {
		it('should fetch user details and respond with 200', async () => {
			pool.query.resolves({
				rowCount: 1,
				rows: [
					{
						user_id: 1,
						email: 'example@example.com',
						first_name: 'FirstName',
						last_name: 'LastName',
						city: 'City',
						country: 'Country',
					},
				],
			});

			const response = await request
				.get('/api/auth/details')
				.set('Cookie', cookie);

			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal({
				userId: 1,
				email: 'example@example.com',
				firstName: 'FirstName',
				lastName: 'LastName',
				city: 'City',
				country: 'Country',
			});
		});

		it('should return 404 if user not found', async () => {
			pool.query.resolves({ rowCount: 0 }); // User does not exist

			const response = await request
				.get('/api/auth/details')
				.set('Cookie', cookie);

			expect(response.status).to.equal(404);
			expect(response.body.message).to.equal('User not found.');
		});
	});
});
