import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/admin/pets', () => {
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

	it('should fetch all pets successfully', async () => {
		const mockPets = [
			{
				pet_id: 1,
				name: 'Buddy',
				type: 'Dog',
				owner_info: 'Happy Tails Rescue',
			},
			{
				pet_id: 2,
				name: 'Whiskers',
				type: 'Cat',
				owner_info: 'user@example.com',
			},
		];
		pool.query.resolves({ rows: mockPets });

		const response = await request.get('/api/admin/pets').set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockPets);
		// sinon.assert.calledWith(logger.info, 'Fetching all pets');
		// sinon.assert.calledWith(
		// 	logger.info,
		// 	`Successfully fetched all pets. Count: ${mockPets.length}`
		// );
	});

	it('should return 500 if there is an error fetching pets', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request.get('/api/admin/pets').set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch pets');
		expect(response.body.error).to.equal('Database Error');
		// sinon.assert.calledWith(
		// 	logger.error,
		// 	'Failed to fetch pets: Database Error'
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
			.get('/api/admin/pets')
			.set('Cookie', nonAdminCookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.include('Access denied. Not an admin.');
	});
});
