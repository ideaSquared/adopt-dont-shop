import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/rescue/:id endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should fetch a specific rescue successfully when it exists', async () => {
		const rescueId = '1';
		const mockRescue = { rescue_id: '1', name: 'Happy Tails' };

		pool.query.resolves({ rows: [mockRescue] });

		const response = await request
			.get(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Rescue fetched successfully');
		expect(response.body.data).to.deep.equal(mockRescue);
	});

	it('should return 404 when the rescue is not found', async () => {
		const rescueId = '2';

		pool.query.resolves({ rows: [] });

		const response = await request
			.get(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		const rescueId = '3';

		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch rescue');
		expect(response.body.error).to.include('Database error');
	});
});
