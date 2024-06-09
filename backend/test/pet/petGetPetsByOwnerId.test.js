import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/pets/owner/:ownerId', () => {
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

	it('should fetch pets, ratings, and application counts successfully for a given owner', async () => {
		const ownerId = 'testOwnerId';
		const mockPets = [
			{
				pet_id: '1',
				name: 'Rex',
				owner_id: ownerId,
				short_description: 'Friendly dog',
				long_description: 'Very friendly dog, loves to play fetch',
				age: 5,
				gender: 'Male',
				status: 'Adoption',
				type: 'Dog',
				vaccination_status: 'Up to date',
				breed: 'Golden Retriever',
			},
		];
		const mockRatings = [
			{
				pet_id: '1',
				rating_type: 'like',
				count: '10',
			},
			{
				pet_id: '1',
				rating_type: 'love',
				count: '5',
			},
		];
		const mockApplications = [
			{
				pet_id: '1',
				application_count: '3',
			},
		];
		pool.query.onFirstCall().resolves({ rows: mockPets, rowCount: 1 });
		pool.query.onSecondCall().resolves({ rows: mockRatings, rowCount: 2 });
		pool.query.onThirdCall().resolves({ rows: mockApplications, rowCount: 1 });

		const expectedResponse = [
			{
				...mockPets[0],
				ratings: {
					like: 10,
					love: 5,
				},
				application_count: 3,
			},
		];

		const response = await request
			.get(`/api/pets/owner/${ownerId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(expectedResponse);
	});

	it('should return 404 when no pets are found for the owner', async () => {
		const ownerId = 'testOwnerId';
		pool.query.onFirstCall().resolves({ rows: [], rowCount: 0 });

		const response = await request
			.get(`/api/pets/owner/${ownerId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('No pets found for this owner');
	});

	it('should handle errors when failing to fetch pets for an owner', async () => {
		const ownerId = 'testOwnerId';
		pool.query.onFirstCall().rejects(new Error('Database error'));

		const response = await request
			.get(`/api/pets/owner/${ownerId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'Failed to fetch pets for this owner'
		);
		expect(response.body.error).to.include('Database error');
	});
});
