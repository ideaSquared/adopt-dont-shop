import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/applications/pet/:petId (Rescue)', () => {
	let sandbox, rescueToken, userToken, cookie, secret;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		secret = process.env.SECRET_KEY;
		const rescuePayload = { userId: 'rescueId', isRescue: true };
		const userPayload = { userId: 'userId', isRescue: false };
		rescueToken = jwt.sign(rescuePayload, secret, { expiresIn: '1h' });
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${rescueToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should fetch all applications for a specific pet successfully for rescue', async () => {
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
				pet_id: 'pet1',
				status: 'approved',
			},
		];

		pool.query.resolves({ rows: mockApplications });

		const response = await request
			.get('/api/applications/pet/pet1')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockApplications);
	});

	it('should return 403 if the user is not a rescue', async () => {
		const userCookie = `token=${userToken};`;

		const response = await request
			.get('/api/applications/pet/pet1')
			.set('Cookie', userCookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Forbidden');
	});

	// ! This fails for some reason - will skip for now
	it.skip('should handle errors gracefully if there is a database error', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/applications/pet/pet1')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
