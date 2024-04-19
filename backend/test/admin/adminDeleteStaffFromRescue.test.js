import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('DELETE /api/admin/rescues/:rescueId/staff/:staffId', () => {
	let sandbox, cookie, adminToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox.stub(logger, 'info');
		// sandbox.stub(logger, 'warn');
		// sandbox.stub(logger, 'error');
		// sandbox.stub(Sentry, 'captureException');

		// Set up JWT and cookie for an admin user
		const secret = process.env.SECRET_KEY; // Your JWT secret should be consistent
		const adminPayload = { userId: 'adminUserId', isAdmin: true };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		cookie = `token=${adminToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should delete a staff member from a rescue successfully', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 1 }); // Rescue exists
		pool.query
			.onSecondCall()
			.resolves({ rowCount: 1, rows: [{ user_id: 'staffId' }] }); // Staff member deleted successfully

		const response = await request
			.delete('/api/admin/rescues/1/staff/2')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			'Staff member deleted successfully.'
		);
		// sinon.assert.calledWith(
		// 	logger.info,
		// 	'Staff member with ID 2 deleted from rescue 1 successfully.'
		// );
	});

	it('should return 404 if the rescue does not exist', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 0 }); // Rescue does not exist

		const response = await request
			.delete('/api/admin/rescues/999/staff/2')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found.');
		// sinon.assert.calledWith(logger.warn, 'Rescue with ID 999 not found.');
	});

	it('should return 404 if the staff member does not exist in the rescue', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 1 }); // Rescue exists
		pool.query.onSecondCall().resolves({ rowCount: 0 }); // Staff member not found

		const response = await request
			.delete('/api/admin/rescues/1/staff/999')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Staff member not found.');
		// sinon.assert.calledWith(
		// 	logger.warn,
		// 	'Staff member with ID 999 not found in rescue 1.'
		// );
	});

	it('should return 500 if there is an error deleting the staff member', async () => {
		pool.query.rejects(new Error('Database Error')); // Simulate a database error

		const response = await request
			.delete('/api/admin/rescues/1/staff/2')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to delete staff member.');
		expect(response.body.error).to.equal('Database Error');
		// sinon.assert.calledWith(
		// 	logger.error,
		// 	'Failed to delete staff member with ID 2 from rescue 1: Database Error'
		// );
		// sinon.assert.calledWith(
		// 	Sentry.captureException,
		// 	sinon.match.instanceOf(Error)
		// );
	});

	it('should return 403 if user is not an admin', async () => {
		// Change the cookie to simulate a non-admin user
		const nonAdminPayload = { userId: 'userUserId', isAdmin: false };
		const nonAdminToken = jwt.sign(nonAdminPayload, process.env.SECRET_KEY, {
			expiresIn: '1h',
		});
		const nonAdminCookie = `token=${nonAdminToken};`;

		const response = await request
			.delete('/api/admin/rescues/1/staff/2')
			.set('Cookie', nonAdminCookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.include('Access denied. Not an admin.');
	});
});
