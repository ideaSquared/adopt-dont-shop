import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import { validateRequest } from '../../middleware/validateRequest.js'; // Adjust as necessary

const request = supertest(app);

describe('POST /api/ratings endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		// Mock JWT authentication and request validation if needed
		// sandbox.stub(jwt, 'verify').callsFake(() => ({ userId: 'testUserId' }));

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should create a rating successfully when pet exists', async () => {
		const petId = '123';
		const ratingType = 'like';

		pool.query
			.onFirstCall()
			.resolves({ rowCount: 1, rows: [{ pet_id: petId }] });
		pool.query.onSecondCall().resolves({
			rows: [
				{
					rating_id: '1',
					user_id: 'testUserId',
					pet_id: petId,
					rating_type: ratingType,
				},
			],
		});

		const response = await request
			.post('/api/ratings')
			.set('Cookie', cookie)
			.send({ petId, ratingType })
			.expect(201);

		expect(response.status).to.equal(201);
		expect(response.body.message).to.equal('Rating created successfully');
		expect(response.body.data.rating_type).to.equal(ratingType);
	});

	it('should return 404 if the pet does not exist', async () => {
		const petId = '124';
		const ratingType = 'like';

		pool.query.resolves({ rowCount: 0, rows: [] });

		const response = await request
			.post('/api/ratings')
			.set('Cookie', cookie)
			.send({ petId, ratingType })
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Pet not found');
	});

	it('should handle errors gracefully', async () => {
		const petId = '125';
		const ratingType = 'like';

		pool.query
			.onFirstCall()
			.resolves({ rowCount: 1, rows: [{ pet_id: petId }] });
		pool.query.onSecondCall().rejects(new Error('Database error'));

		const response = await request
			.post('/api/ratings')
			.set('Cookie', cookie)
			.send({ petId, ratingType })
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('An error occurred');
	});
});
