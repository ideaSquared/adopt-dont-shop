import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { convertPetAge } from '../../utils/petConvertMonthsToYears.js'; // Import the age conversion utility

const request = supertest(app);

describe('GET /api/pets', () => {
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

	it('should fetch all pets successfully', async () => {
		// Prepare stub data
		const mockPets = [
			{
				id: 1,
				name: 'Rex',
				ownerId: 'testUserId',
				short_description: 'Friendly dog',
				long_description: 'Very friendly dog, loves to play fetch',
				age: 5,
				gender: 'Male',
				status: 'Adoption',
				type: 'Dog',
				vaccination_status: 'Up to date',
				breed: 'Golden Retriever',
			},
			{
				id: 2,
				name: 'Bella',
				ownerId: 'testUserId',
				short_description: 'Calm cat',
				long_description: 'Very calm cat, loves to sleep',
				age: 24,
				gender: 'Female',
				status: 'Adoption',
				type: 'Cat',
				vaccination_status: 'Up to date',
				breed: 'Siamese',
			},
		];
		pool.query.resolves({ rows: mockPets });

		// Convert ages for the expected response
		const expectedPets = mockPets.map((pet) => ({
			...pet,
			age: convertPetAge(pet.age),
		}));

		const response = await request.get('/api/pets').set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Pets fetched successfully');
		expect(response.body.data).to.deep.equal(expectedPets);
	});

	it('should handle errors when failing to fetch pets', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request.get('/api/pets').set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch pets');
		expect(response.body.error).to.include('Database error');
	});
});
