import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js';
import app from '../../index.js';
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';

const request = supertest(app);

describe('DELETE /api/pets/:id endpoint', () => {
	let sandbox, userToken, cookie, checkPermissionStub;

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

	it('should successfully delete a pet when permissions are sufficient', async () => {
		const petId = '123';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.resolves({ rowCount: 1 }); // Simulates successful deletion

		const response = await request
			.delete(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Pet deleted successfully');
	});

	it('should return 403 if the user does not have permission to delete the pet', async () => {
		const petId = '124';
		sandbox.stub(permissionService, 'checkPermission').resolves(false);

		const response = await request
			.delete(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Insufficient permissions to delete pet'
		);
	});

	it('should return 404 if no pet is found with the provided ID', async () => {
		const petId = '125';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.resolves({ rowCount: 0 }); // Simulates no pet found

		const response = await request
			.delete(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Pet not found');
	});

	it('should handle errors and return 500 if an exception occurs', async () => {
		const petId = '126';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.rejects(new Error('Internal server error')); // Simulates a server error

		const response = await request
			.delete(`/api/pets/${petId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to delete pet');
	});
});
