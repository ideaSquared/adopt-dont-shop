import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/applications/user/:userId (Admin + User)', () => {
	let sandbox, adminToken, userToken, cookie, secret;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		secret = process.env.SECRET_KEY;
		const adminPayload = { userId: 'adminId', isAdmin: true };
		const userPayload = { userId: 'userId', isAdmin: false };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should fetch all applications for a user successfully for admin', async () => {
		cookie = `token=${adminToken};`;
		const mockApplications = [
			{
				application_id: '1',
				user_id: 'userId',
				pet_id: 'pet1',
				status: 'pending',
			},
			{
				application_id: '2',
				user_id: 'userId',
				pet_id: 'pet2',
				status: 'approved',
			},
		];

		pool.query.resolves({ rows: mockApplications });

		const response = await request
			.get('/api/applications/user/userId')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.data).to.deep.equal(mockApplications);
	});

	it('should fetch all applications for a user successfully for the user themselves', async () => {
		cookie = `token=${userToken};`;
		const mockApplications = [
			{
				application_id: '1',
				user_id: 'userId',
				pet_id: 'pet1',
				status: 'pending',
			},
			{
				application_id: '2',
				user_id: 'userId',
				pet_id: 'pet2',
				status: 'approved',
			},
		];

		pool.query.resolves({ rows: mockApplications });

		const response = await request
			.get('/api/applications/user/userId')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.data).to.deep.equal(mockApplications);
	});

	it('should return 403 if the user is not admin and not the owner', async () => {
		const anotherUserPayload = { userId: 'anotherUserId', isAdmin: false };
		const anotherUserToken = jwt.sign(anotherUserPayload, secret, {
			expiresIn: '1h',
		});
		const anotherUserCookie = `token=${anotherUserToken};`;

		const response = await request
			.get('/api/applications/user/userId')
			.set('Cookie', anotherUserCookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Forbidden');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		cookie = `token=${userToken};`;
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/applications/user/userId')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
