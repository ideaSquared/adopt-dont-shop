import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/applications (Admin)', () => {
	let sandbox, adminToken, cookie, userCookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY;
		const adminPayload = { userId: 'adminId', isAdmin: true };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		cookie = `token=${adminToken};`;

		const userPayload = { userId: 'userId', isAdmin: false };
		const userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		userCookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should fetch all applications successfully for admin', async () => {
		const mockApplications = [
			{
				application_id: '1',
				user_id: 'user1',
				pet_id: 'pet1',
				status: 'pending',
			},
			{
				application_id: '2',
				user_id: 'user2',
				pet_id: 'pet2',
				status: 'approved',
			},
		];

		pool.query.resolves({ rows: mockApplications });

		const response = await request
			.get('/api/applications')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockApplications);
	});

	it('should return 403 if the user is not an admin', async () => {
		const response = await request
			.get('/api/applications')
			.set('Cookie', userCookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Access denied. Not an admin.');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/applications')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
