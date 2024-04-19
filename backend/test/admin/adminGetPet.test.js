import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/admin/pets/:id', () => {
	let sandbox, cookie, adminToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox.stub(logger, 'info');
		// sandbox.stub(logger, 'warn');
		// sandbox.stub(logger, 'error');
		// sandbox.stub(Sentry, 'captureException');

		// Set up JWT and cookie for an admin user
		const secret = process.env.SECRET_KEY; // Ensure your JWT secret is correctly configured
		const adminPayload = { userId: 'adminUserId', isAdmin: true };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		cookie = `token=${adminToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should fetch a specific pet by ID successfully', async () => {
		const mockPet = {
			pet_id: 1,
			name: 'Buddy',
			type: 'Dog',
		};
		pool.query.resolves({ rows: [mockPet] });

		const response = await request
			.get('/api/admin/pets/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockPet);
		// sinon.assert.calledWith(logger.info, 'Successfully fetched pet with ID: 1');
	});

	it('should return 404 if the pet does not exist', async () => {
		pool.query.resolves({ rows: [] });

		const response = await request
			.get('/api/admin/pets/999')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Pet not found');
		// sinon.assert.calledWith(logger.warn, 'Pet not found with ID: 999');
	});

	it('should return 500 if there is an error fetching the pet', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.get('/api/admin/pets/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch pet');
		expect(response.body.error).to.equal('Database Error');
		// sinon.assert.calledWith(logger.error, 'Failed to fetch pet with ID: 1: Database Error');
		// sinon.assert.calledWith(Sentry.captureException, sinon.match.instanceOf(Error));
	});

	it('should return 403 if user is not an admin', async () => {
		// Change the cookie to simulate a non-admin user
		const nonAdminPayload = { userId: 'userUserId', isAdmin: false };
		const nonAdminToken = jwt.sign(nonAdminPayload, process.env.SECRET_KEY, {
			expiresIn: '1h',
		});
		const nonAdminCookie = `token=${nonAdminToken};`;

		const response = await request
			.get('/api/admin/pets/1')
			.set('Cookie', nonAdminCookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.include('Access denied. Not an admin.');
	});
});
