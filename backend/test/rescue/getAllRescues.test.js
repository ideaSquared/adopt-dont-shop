import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/rescue endpoint', () => {
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

	it('should fetch all rescues successfully', async () => {
		const mockRescues = [
			{ rescue_id: '1', name: 'Happy Paws', location: 'City A' },
			{ rescue_id: '2', name: 'Safe Haven', location: 'City B' },
		];

		pool.query.resolves({ rows: mockRescues });

		const response = await request
			.get('/api/rescue')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Rescues fetched successfully');
		expect(response.body.data).to.deep.equal(mockRescues);
		expect(response.body.data).to.have.lengthOf(2);
	});

	it('should return an empty array when no rescues are available', async () => {
		pool.query.resolves({ rows: [] });

		const response = await request
			.get('/api/rescue')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.data).to.deep.equal([]);
		expect(response.body.message).to.equal('Rescues fetched successfully');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/rescue')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch rescues');
		expect(response.body.error).to.include('Database error');
	});
});
