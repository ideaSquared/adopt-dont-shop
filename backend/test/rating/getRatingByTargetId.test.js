import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/ratings/target/:targetId ratings endpoint', () => {
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
		sinon.restore();
		sandbox.restore();
	});

	it('should fetch ratings successfully when they exist', async () => {
		const targetId = '123';
		const mockRatings = [
			{ rating_id: '1', target_id: targetId, rating_type: 'like' },
			{ rating_id: '2', target_id: targetId, rating_type: 'dislike' },
		];

		pool.query.resolves({ rows: mockRatings, rowCount: 2 });

		const response = await request
			.get(`/api/ratings/target/${targetId}`)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Ratings fetched successfully');
		expect(response.body.data).to.deep.equal(mockRatings);
	});

	it('should return 404 if no ratings are found for the specified targetId', async () => {
		const targetId = '124';

		pool.query.resolves({ rows: [] });

		const response = await request
			.get(`/api/ratings/target/${targetId}`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('No ratings found');
	});

	it('should handle errors gracefully', async () => {
		const targetId = '125';

		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get(`/api/ratings/target/${targetId}`)
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch ratings');
		expect(response.body.error).to.include('Database error');
	});
});
