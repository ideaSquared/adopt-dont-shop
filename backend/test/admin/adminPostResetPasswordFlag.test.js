import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../../utils/Logger.js';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('POST /api/admin/users/reset-password/:id', () => {
	let sandbox, cookie, adminToken, nonAdminToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox.stub(logger, 'info');
		// sandbox.stub(logger, 'error');
		// sandbox.stub(Sentry, 'captureException');

		const secret = process.env.SECRET_KEY; // Ensure your JWT secret is correctly configured
		const adminPayload = { userId: 'adminUser', isAdmin: true };
		const nonAdminPayload = { userId: 'normalUser', isAdmin: false };
		adminToken = jwt.sign(adminPayload, secret);
		nonAdminToken = jwt.sign(nonAdminPayload, secret);

		cookie = `token=${adminToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should enforce a password reset', async () => {
		// Simulate user exists
		pool.query.onFirstCall().resolves({ rowCount: 1 });
		// Simulate successful update
		pool.query.onSecondCall().resolves({ rowCount: 1 });

		const response = await request
			.post('/api/admin/users/reset-password/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Password reset required.');
		// sinon.assert.calledWith(logger.info, sinon.match.string);
	});

	it('should return 404 if the user does not exist', async () => {
		// Simulate user does not exist
		pool.query.onFirstCall().resolves({ rowCount: 0 });

		const response = await request
			.post('/api/admin/users/reset-password/999')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('User not found.');
	});

	it('should return 404 if no rows were updated', async () => {
		// Simulate user exists
		pool.query.onFirstCall().resolves({ rowCount: 1 });
		// Simulate no rows updated
		pool.query.onSecondCall().resolves({ rowCount: 0 });

		const response = await request
			.post('/api/admin/users/reset-password/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal(
			'Failed to update user for password reset.'
		);
	});

	it('should return 500 if there is a database error', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.post('/api/admin/users/reset-password/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to enforce password reset.');
		// sinon.assert.calledWith(
		// 	Sentry.captureException,
		// 	sinon.match.instanceOf(Error)
		// );
		// sinon.assert.calledWith(logger.error, sinon.match.string);
	});

	it('should return 403 if user is not an admin', async () => {
		cookie = `token=${nonAdminToken};`; // Simulate a non-admin user
		const response = await request
			.post('/api/admin/users/reset-password/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Access denied. Not an admin.');
	});
});
