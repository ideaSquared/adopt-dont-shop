import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { permissions } from '../../utils/permissions.js'; // Adjust the path as necessary

const request = supertest(app);

describe('PUT /:id', () => {
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

	it('should update a pet successfully if the user has permissions', async () => {
		const petId = 1;
		const updatedPet = {
			name: 'Updated Rex',
			age: 6,
		};
		const mockPet = {
			id: petId,
			...updatedPet,
		};
		sinon.stub(permissions, 'checkPermission').resolves(true);
		pool.query.resolves({ rows: [mockPet], rowCount: 1 });

		const response = await request
			.put(`/api/pets/${petId}`)
			.send(updatedPet)
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Pet updated successfully');
		expect(response.body.data).to.deep.equal(mockPet);
	});

	it('should return 403 if the user does not have permission to edit the pet', async () => {
		const petId = 2;
		sinon.stub(permissions, 'checkPermission').resolves(false);

		const response = await request
			.put(`/api/pets/${petId}`)
			.send({ name: 'Buddy' })
			.set('Cookie', cookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Insufficient permissions to edit pet'
		);
	});

	it('should return 400 if no updatable fields are provided', async () => {
		const petId = 3;
		sinon.stub(permissions, 'checkPermission').resolves(true);

		const response = await request
			.put(`/api/pets/${petId}`)
			.send({ pet_id: petId }) // Invalid update field
			.set('Cookie', cookie);

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('No updatable fields provided');
	});

	it('should handle errors appropriately when the update fails', async () => {
		const petId = 4;
		sinon.stub(permissions, 'checkPermission').resolves(true);
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.put(`/api/pets/${petId}`)
			.send({ name: 'Buddy' })
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to update pet');
		expect(response.body.error).to.include('Database error');
	});
});
