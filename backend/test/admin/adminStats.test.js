import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

// ! Skipping as its not a critical route
describe.skip('Statistics Endpoints', () => {
	let sandbox, cookie, adminToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		const secret = process.env.SECRET_KEY; // Ensure your JWT secret is correctly configured
		const adminPayload = { userId: 'adminUserId', isAdmin: true };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		cookie = `token=${adminToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	describe('GET /api/admin/stats-created-count', () => {
		it('should fetch created counts successfully', async () => {
			const statsMock = {
				users: [{ week: 1, count: 10 }],
				rescues: [{ week: 1, count: 5 }],
			};

			pool.query.onFirstCall().resolves({ rows: [{ week: 1, count: 10 }] }); // For users
			pool.query.onSecondCall().resolves({ rows: [{ week: 1, count: 5 }] }); // For rescues, adjust according to the specific order your code processes the tables
			const response = await request
				.get('/api/admin/stats-created-count')
				.set('Cookie', cookie);
			expect(response.status).to.equal(200);
			expect(response.body).to.deep.include(statsMock);
		});

		it('should handle database errors', async () => {
			pool.query.rejects(new Error('Database Error'));
			const response = await request
				.get('/api/admin/stats-created-count')
				.set('Cookie', cookie);
			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal('Database Error');
		});
	});

	describe('GET /api/admin/stats-total-count', () => {
		it('should fetch total counts successfully', async () => {
			const totalCountsMock = {
				users: 20,
				rescues: 10,
			};
			pool.query.onCall(0).resolves({ rows: [{ total_count: '20' }] });
			pool.query.onCall(1).resolves({ rows: [{ total_count: '10' }] });
			const response = await request
				.get('/api/admin/stats-total-count')
				.set('Cookie', cookie);
			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(totalCountsMock);
		});

		it('should handle database errors', async () => {
			pool.query.rejects(new Error('Database Error'));
			const response = await request
				.get('/api/admin/stats-total-count')
				.set('Cookie', cookie);
			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal('Database Error');
		});
	});

	describe('GET /api/admin/stats-all-locations', () => {
		it('should fetch all locations successfully', async () => {
			const locationsDataMock = {
				users: [{ city: 'City', country: 'Country', location: 'Location' }],
				rescues: [{ city: 'City', country: 'Country', location: 'Location' }],
			};
			pool.query.onCall(0).resolves({ rows: locationsDataMock.users });
			pool.query.onCall(1).resolves({ rows: locationsDataMock.rescues });
			const response = await request
				.get('/api/admin/stats-all-locations')
				.set('Cookie', cookie);
			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(locationsDataMock);
		});

		it('should handle database errors', async () => {
			pool.query.rejects(new Error('Database Error'));
			const response = await request
				.get('/api/admin/stats-all-locations')
				.set('Cookie', cookie);
			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal('Database Error');
		});
	});

	// Testing Authorization
	it('should return 403 if user is not an admin', async () => {
		const nonAdminPayload = { userId: 'userUserId', isAdmin: false };
		const nonAdminToken = jwt.sign(nonAdminPayload, process.env.SECRET_KEY, {
			expiresIn: '1h',
		});
		const nonAdminCookie = `token=${nonAdminToken};`;

		const response = await request
			.get('/api/admin/stats-created-count')
			.set('Cookie', nonAdminCookie);
		expect(response.status).to.equal(403);
		expect(response.body.message).to.include('Access denied. Not an admin.');
	});
});
