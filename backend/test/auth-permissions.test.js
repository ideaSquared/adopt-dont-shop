import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import jwt from 'jsonwebtoken'; // For JWT token verification stubbing
import { pool } from '../dbConnection.js';
import app from '../index.js';
// import logger from '../path/to/your/logger'; // Update path as necessary
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/auth/permissions', () => {
	let sandbox, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox.stub(logger, 'info');
		// sandbox.stub(logger, 'warn');
		// sandbox.stub(logger, 'error');
		// sandbox.stub(Sentry, 'captureException');

		// Stubbing JWT verification to automatically authenticate all requests
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

	it('should return user permissions if the user is a staff member', async () => {
		// Setup mock response from database
		const mockPermissions = ['edit_rescue', 'view_rescue'];
		pool.query.resolves({
			rowCount: 1,
			rows: [{ permissions: mockPermissions }],
		});

		const response = await request
			.get('/api/auth/permissions')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.permissions).to.deep.equal(mockPermissions);
		// sinon.assert.calledWith(logger.info, sinon.match.string);
	});

	it('should return 404 if no permissions are found for the user', async () => {
		pool.query.resolves({ rowCount: 0 });

		const response = await request
			.get('/api/auth/permissions')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal(
			'User is not a staff member of any rescue organization.'
		);
		// sinon.assert.calledWith(logger.warn, sinon.match.string);
	});

	it('should handle database errors and return 500', async () => {
		const errorMessage = 'Database error';
		pool.query.rejects(new Error(errorMessage));

		const response = await request
			.get('/api/auth/permissions')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch permissions.');
		// sinon.assert.calledWith(logger.error, sinon.match.string);
		// sinon.assert.calledWith(
		// 	Sentry.captureException,
		// 	sinon.match.instanceOf(Error)
		// );
	});
});
