import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import jwt from 'jsonwebtoken'; // For JWT token verification stubbing
import { pool } from '../dbConnection.js';
import app from '../index.js';
// import logger from '../path/to/your/logger'; // Update path as necessary
// import Sentry from '@sentry/node';

const request = supertest(app);

describe.skip('GET /api/auth/status', () => {
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

	it('should return user status if authenticated', async () => {
		pool.query.resolves({ rowCount: 1, rows: [{ is_admin: false }] });

		const response = await request.get('/api/auth/status');

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal({
			isLoggedIn: true,
			userId: 'mockUserId',
			isAdmin: false,
		});
		// sinon.assert.calledWith(logger.info, sinon.match.string);
	});

	it('should return 404 if no user is found', async () => {
		pool.query.resolves({ rowCount: 0 });

		const response = await request.get('/api/auth/status');

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('User not found.');
		// sinon.assert.calledWith(logger.warn, sinon.match.string);
	});

	it('should return 500 if an error occurs during status check', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request.get('/api/auth/status');

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Error checking user status.');
		// sinon.assert.calledWith(logger.error, sinon.match.string);
	});
});
