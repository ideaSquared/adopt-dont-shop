// Import necessary testing and mocking libraries
import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../dbConnection.js'; // Import your database connection pool
import app from '../index.js'; // Import your Express application
import jwt from 'jsonwebtoken';

// Allows mocking of the permissions check
import { permissionService } from '../../services/permissionService.js';

// Create a supertest agent
const request = supertest(app);

// Template for testing a specific API route
describe.skip('API Test Example', () => {
	let sandbox;
	// AuthenticateToken middleware variables
	let userToken, cookie;

	beforeEach(() => {
		// Create a sandbox for stubbing
		sandbox = sinon.createSandbox();

		// Stubbing the necessary external calls
		// Adjust according to the needs of the test, e.g., database queries, external services, etc.
		sandbox.stub(pool, 'query');

		// This provides the userId to the authenticateToken middleware.
		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

		// If user should have a specific permission this should resolve true.
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
	});

	afterEach(() => {
		// Restore all the stubs
		sandbox.restore();
	});

	it('should handle the intended behavior of the route', async () => {
		// Set up your mocks and expected behavior
		pool.query.resolves({
			/* Expected result */
		});

		// Define the request and assertions
		const response = await request
			.get('/api/your/route') // Change the method and route as needed
			.set('Cookie', cookie) // Provides the cookie to the middleware to parse.
			.send({
				/* Request payload if necessary */
			})
			.expect('Content-Type', /json/);

		expect(response.status).to.equal(200); // Adjust the expected status code
		expect(response.body).to.deep.include({
			/* Expected response body */
		});
	});

	// Add more test cases as necessary for handling errors, different scenarios, etc.
});
