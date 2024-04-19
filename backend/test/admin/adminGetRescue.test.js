import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/admin/rescues/:id', () => {
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

	it('should fetch a specific rescue by ID successfully', async () => {
		const mockRescue = {
			rescue_id: '1',
			rescue_name: 'Hope Rescues',
			rescue_type: 'Animal',
			city: 'Springfield',
			country: 'USA',
			staff: [
				{
					userId: 'user123',
					email: 'staff@example.com',
					permissions: 'admin',
				},
			],
		};
		pool.query.resolves({ rows: [mockRescue] });

		const response = await request
			.get('/api/admin/rescues/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal({
			rescue_id: '1',
			rescue_name: 'Hope Rescues',
			rescue_type: 'Animal',
			rescue_city: 'Springfield',
			rescue_country: 'USA',
			staff: [
				{
					userId: 'user123',
					email: 'staff@example.com',
					permissions: 'admin',
				},
			],
		});
		// sinon.assert.calledWith(
		// 	logger.info,
		// 	'Rescue fetched successfully for Hope Rescues.'
		// );
	});

	it('should return 404 if the rescue does not exist', async () => {
		pool.query.resolves({ rows: [] });

		const response = await request
			.get('/api/admin/rescues/999')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});

	it('should return 500 if there is an error fetching the rescue', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.get('/api/admin/rescues/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch rescue');
		expect(response.body.error).to.equal('Database Error');
		// sinon.assert.calledWith(
		// 	logger.error,
		// 	'Failed to fetch rescue: Database Error'
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
			.get('/api/admin/rescues/1')
			.set('Cookie', nonAdminCookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.include('Access denied. Not an admin.');
	});
});
