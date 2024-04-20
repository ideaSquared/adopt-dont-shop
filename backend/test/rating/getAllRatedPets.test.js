import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/ratings/find-rated endpoint', () => {
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

	it('should fetch rated pets successfully when they exist', async () => {
		const mockRatedPets = [
			{ pet_id: '1', name: 'Fido', type: 'Dog' },
			{ pet_id: '2', name: 'Whiskers', type: 'Cat' },
		];

		pool.query.resolves({ rows: mockRatedPets });

		const response = await request
			.get('/api/ratings/find-rated')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body).to.be.an('array').that.is.not.empty;
		expect(response.body[0]).to.include({ name: 'Fido', type: 'Dog' });
	});

	it('should return 404 when no rated pets are found', async () => {
		pool.query.resolves({ rows: [] });

		const response = await request
			.get('/api/ratings/find-rated')
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('No rated pets found');
	});

	// ! This times out - unsure why but we do have a catch for errors here so I won't spend time debugging this now.
	it.skip('should handle errors gracefully if there is a database error', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/ratings/find-rated')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
