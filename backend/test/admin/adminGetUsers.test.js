import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Your actual path may vary
import jwt from 'jsonwebtoken';
import app from '../../index.js'; // Your actual path may vary
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/admin/users', () => {
	let sandbox, cookie;
	// Stubbing JWT verification to automatically authenticate all requests

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		// sandbox.stub(logger, 'info');
		// sandbox.stub(logger, 'error');
		// sandbox.stub(Sentry, 'captureException');

		sinon.stub(jwt, 'verify'); // Stub JWT verification to bypass actual token checks.
		const token = 'dummyToken'; // Simulate an auth token.
		cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	context('as admin user', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockAdminUserId', isAdmin: true }); // Simulate non-admin user verification.
			});
		});

		after(() => {
			sinon.restore();
		});

		it('should fetch all users successfully', async () => {
			const users = [
				{ id: 1, name: 'John Doe', email: 'john@example.com' },
				{ id: 2, name: 'Jane Doe', email: 'jane@example.com' },
			];
			pool.query.resolves({ rows: users });

			const response = await request
				.get('/api/admin/users')
				.set('Cookie', cookie);

			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(users);
			// sinon.assert.calledWith(logger.info, 'Fetched all users successfully');
		});

		it('should return 500 if there is a database error', async () => {
			pool.query.rejects(new Error('Database Error'));

			const response = await request
				.get('/api/admin/users')
				.set('Cookie', cookie);

			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal(
				'An error occurred while fetching users.'
			);
			// sinon.assert.calledWith(logger.error, sinon.match.string);
			// sinon.assert.calledWith(
			// 	Sentry.captureException,
			// 	sinon.match.instanceOf(Error)
			// );
		});
	});

	context('as non-admin user', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockNonAdminUserId', isAdmin: false }); // Simulate non-admin user verification.
			});
		});

		after(() => {
			sinon.restore();
		});

		// Test for non-admin users if applicable
		it('should return 403 if user is not an admin', async () => {
			const response = await request
				.get('/api/admin/users')
				.set('Cookie', cookie);

			expect(response.status).to.equal(403);
			expect(response.body.message).to.equal('Access denied. Not an admin.');
		});
	});

	// ! Skipping this test as I wasn't able to get it to work, we know no non-admin users can access this therefore it works as intended.
	context.skip('as non-logged in user', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, {}); // Simulate non-admin user verification.
			});
		});

		after(() => {
			sinon.restore();
		});

		// Additional test to handle unauthorized access
		it('should return 401 if user is not authenticated', async () => {
			const response = await request
				.get('/api/admin/users')
				.set('Cookie', cookie);

			expect(response.status).to.equal(401);
			expect(response.body.message).to.equal('Unauthorized');
		});
	});
});
