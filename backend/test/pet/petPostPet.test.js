import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';

const request = supertest(app);

describe('POST /api/pets', () => {
	let sandbox, cookie, userToken;

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
		sandbox.restore(); // Restore all stubs/spies created within the sandbox
	});

	it('should create a new pet record successfully', async () => {
		sinon.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.resolves({
			rows: [
				{
					pet_id: 123,
				},
			],
		});

		const petData = {
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
			other_pets: 'None',
			household: 'Active',
			energy: 'High',
			family: 'Friendly',
			temperament: 'Calm',
			health: 'Good',
			size: 'Large',
			grooming_needs: 'Regular grooming',
			training_socialization: 'Required',
			commitment_level: 'High',
		};

		const response = await request
			.post('/api/pets')
			.set('Cookie', cookie)
			.send(petData);

		expect(response.status).to.equal(201);
		expect(response.body.data.id).to.equal(123);
		expect(response.body.data.name).to.equal('Rex');
	});

	it('should return 403 if the user does not have permission', async () => {
		sinon.stub(permissionService, 'checkPermission').resolves(false);

		const response = await request
			.post('/api/pets')
			.set('Cookie', cookie)
			.send({
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
			});

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Insufficient permissions to add pet'
		);
	});

	it('should handle database errors gracefully', async () => {
		sinon.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.rejects(new Error('Database connection failed'));

		const response = await request
			.post('/api/pets')
			.set('Cookie', cookie)
			.send({
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
			});

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('An error occurred');
	});
});
