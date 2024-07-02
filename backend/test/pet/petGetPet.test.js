import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { convertPetAge } from '../../utils/petConvertMonthsToYears.js'; // Import the age conversion utility

const request = supertest(app);

describe('GET /api/pets/:id', () => {
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

	it('should fetch a pet successfully by ID', async () => {
		const petId = 1;
		const mockPet = {
			id: petId,
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
		};
		pool.query.resolves({ rows: [mockPet], rowCount: 1 });

		const expectedPet = {
			...mockPet,
			age: convertPetAge(mockPet.age),
		};

		const response = await request
			.get(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Pet fetched successfully');
		expect(response.body.data).to.deep.equal(expectedPet);
	});

	it('should return 404 when pet not found', async () => {
		const petId = 2;
		pool.query.resolves({ rows: [], rowCount: 0 });

		const response = await request
			.get(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Pet not found');
	});

	it('should handle errors when failing to fetch pet by ID', async () => {
		const petId = 3;
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to fetch pet');
		expect(response.body.error).to.include('Database error');
	});
});
