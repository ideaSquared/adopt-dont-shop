import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('DELETE /api/admin/users/delete/:id', () => {
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

	it('should successfully delete a user', async () => {
		pool.query.resolves({ rows: [{ user_id: '123' }] });

		const response = await request
			.delete('/api/admin/users/delete/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('User deleted successfully.');
		// sinon.assert.calledWith(logger.info, sinon.match.string);
	});

	it('should return 404 if the user does not exist', async () => {
		pool.query.resolves({ rows: [] });

		const response = await request
			.delete('/api/admin/users/delete/999')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('User not found.');
		// sinon.assert.calledWith(logger.info, sinon.match.string);
	});

	it('should return 500 if there is a database error', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.delete('/api/admin/users/delete/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to delete user.');
		// sinon.assert.calledWith(logger.error, sinon.match.string);
		// sinon.assert.calledWith(
		// 	Sentry.captureException,
		// 	sinon.match.instanceOf(Error)
		// );
	});

	it('should return 403 if user is not an admin', async () => {
		cookie = `token=${nonAdminToken};`; // Simulate a non-admin user
		const response = await request
			.delete('/api/admin/users/delete/123')
			.set('Cookie', cookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Access denied. Not an admin.');
	});
});
