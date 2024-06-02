import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/admin/rescues', () => {
	let sandbox, cookie, adminToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox.stub(logger, 'info');
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

	it('should fetch all rescues successfully', async () => {
		const mockRescues = [
			{
				rescue_id: 1,
				rescueName: 'Test Rescue',
				rescueType: 'Animal',
				city: 'Springfield',
				country: 'USA',
				staff: [
					{
						userId: 'user123',
						userDetails: { email: 'staff@example.com' },
					},
				],
			},
		];

		const expectedRescues = [
			{
				rescue_id: 1,
				rescueName: 'Test Rescue',
				rescueType: 'Animal',
				rescue_city: 'Springfield',
				rescue_country: 'USA',
				staff: [
					{
						userId: 'user123',
						userDetails: { email: 'staff@example.com' },
					},
				],
			},
		];

		pool.query.resolves({ rows: mockRescues });

		const response = await request
			.get('/api/admin/rescues')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(expectedRescues);
		// sinon.assert.calledWith(logger.info, 'All rescues fetched successfully.');
	});

	it('should return 500 if there is an error fetching rescues', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.get('/api/admin/rescues')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch rescues');
		expect(response.body.error).to.equal('Database Error');
		// sinon.assert.calledWith(
		//  logger.error,
		//  'Failed to fetch rescues: Database Error'
		// );
		// sinon.assert.calledWith(
		//  Sentry.captureException,
		//  sinon.match.instanceOf(Error)
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
			.get('/api/admin/rescues')
			.set('Cookie', nonAdminCookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.include('Access denied. Not an admin.');
	});
});
