import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';
const request = supertest(app);

describe('GET /api/applications/pet/:petId/count (Rescue)', () => {
	let sandbox, rescueToken, cookie, secret;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		secret = process.env.SECRET_KEY;
		const rescuePayload = { userId: 'rescueId', isRescue: true };
		rescueToken = jwt.sign(rescuePayload, secret, { expiresIn: '1h' });
		cookie = `token=${rescueToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should return the count of applications for a specific pet', async () => {
		const mockCount = { application_count: '5' };

		pool.query.resolves({ rows: [mockCount] });

		const response = await request
			.get('/api/applications/pet/pet1/count')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal({
			petId: 'pet1',
			application_count: 5,
		});
	});

	it.skip('should return 403 if the user is not a rescue', async () => {
		sandbox.restore();

		const userPayload = { userId: 'userId', isRescue: false };
		const userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		const userCookie = `token=${userToken};`;

		const response = await request
			.get('/api/applications/pet/pet1/count')
			.set('Cookie', userCookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Forbidden');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/applications/pet/pet1/count')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
