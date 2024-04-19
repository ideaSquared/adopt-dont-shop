import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { pool } from '../dbConnection.js';
import app from '../index.js';
// import logger from '../path/to/your/logger'; // Update path as necessary
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('GET /api/auth/my-rescue', () => {
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

	it('should fetch rescue organization details if user is a staff member', async () => {
		// Mock DB response
		const mockRescueData = {
			rescue_id: 123,
			rescue_name: 'Animal Rescue',
			city: 'Springfield',
			country: 'USA',
			rescue_type: 'Wildlife',
			reference_number: 'REF123',
			reference_number_verified: true,
		};
		const mockStaffData = [
			{
				user_id: 1,
				staff_email: 'staff@example.com',
				permissions: 'admin',
				verified_by_rescue: true,
			},
		];
		pool.query.resolves({
			rowCount: 1,
			rows: [
				...mockStaffData.map((staff) => ({ ...mockRescueData, ...staff })),
			],
		});

		const response = await request
			.get('/api/auth/my-rescue')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.include({
			rescue_id: mockRescueData.rescue_id,
			rescueName: mockRescueData.rescue_name,
			city: mockRescueData.city,
			country: mockRescueData.country,
			rescueType: mockRescueData.rescue_type,
			referenceNumber: mockRescueData.reference_number,
			referenceNumberVerified: mockRescueData.reference_number_verified,
			staff: mockStaffData.map(
				({ user_id, staff_email, permissions, verified_by_rescue }) => ({
					userId: user_id,
					email: staff_email,
					permissions,
					verifiedByRescue: verified_by_rescue,
				})
			),
		});
		// sinon.assert.calledWith(logger.info, sinon.match.string);
	});

	it('should return 404 if user is not associated with any rescue organization', async () => {
		pool.query.resolves({ rowCount: 0 });

		const response = await request
			.get('/api/auth/my-rescue')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal(
			'User is not a staff member of any rescue organization'
		);
		// sinon.assert.calledWith(logger.warn, sinon.match.string);
	});

	it('should handle errors and return 500 if there is a failure in fetching data', async () => {
		const errorMessage = 'Database error';
		pool.query.rejects(new Error(errorMessage));

		const response = await request
			.get('/api/auth/my-rescue')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'An error occurred while fetching the rescue organization'
		);
		// sinon.assert.calledWith(logger.error, sinon.match.string);
		// sinon.assert.calledWith(
		// 	Sentry.captureException,
		// 	sinon.match.instanceOf(Error)
		// );
	});
});
