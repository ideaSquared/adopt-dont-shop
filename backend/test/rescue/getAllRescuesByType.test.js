import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/rescue/filter endpoint', () => {
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

	it('should return 400 for invalid type query parameter', async () => {
		const type = 'nonexistent';

		const response = await request
			.get(`/api/rescue/filter?type=${type}`)
			.set('Cookie', cookie)
			.expect(400);

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal(
			'Invalid or missing type query parameter'
		);
	});

	it('should fetch rescues successfully for a valid type', async () => {
		const type = 'charity';
		const mockRescues = [
			{ rescue_id: '1', name: 'Happy Tails', rescue_type: 'charity' },
		];

		pool.query.resolves({ rows: mockRescues });

		const response = await request
			.get(`/api/rescue/filter?type=${type}`)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			`${type} rescues fetched successfully`
		);
		expect(response.body.data).to.deep.equal(mockRescues);
	});

	it('should return 200 with no rescues found for valid but unmatched type', async () => {
		const type = 'charity';

		pool.query.resolves({ rows: [] });

		const response = await request
			.get(`/api/rescue/filter?type=${type}`)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			`${type} rescues fetched successfully`
		);
		expect(response.body.data).to.deep.equal([]);
	});

	it('should handle errors gracefully if there is a database error', async () => {
		const type = 'charity';

		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get(`/api/rescue/filter?type=${type}`)
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(`Failed to fetch ${type} rescues`);
		expect(response.body.error).to.include('Database error');
	});
});
