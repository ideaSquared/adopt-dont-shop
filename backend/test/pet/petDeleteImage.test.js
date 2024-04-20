import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';

const request = supertest(app);

describe('DELETE /api/pets/:id/images endpoint', () => {
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

	it('should delete specified images when permissions are granted and pet exists', async () => {
		const petId = '123';
		const imagesToDelete = ['image1.jpg', 'image2.jpg'];
		const existingImages = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query
			.onFirstCall()
			.resolves({ rows: [{ images: existingImages }], rowCount: 1 });
		pool.query
			.onSecondCall()
			.resolves({ rows: [{ images: ['image3.jpg'] }], rowCount: 1 });

		const response = await request
			.delete(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.send({ imagesToDelete })
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Images deleted successfully');
		expect(response.body.data.images).to.deep.equal(['image3.jpg']);
	});

	it('should return 400 if no images are specified for deletion', async () => {
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		const petId = '124';
		const response = await request
			.delete(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.send({ imagesToDelete: [] })
			.expect(400);

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('No images specified for deletion');
	});

	it('should return 403 if the user does not have permission to delete images', async () => {
		const petId = '125';
		const imagesToDelete = ['image1.jpg'];

		sandbox.stub(permissionService, 'checkPermission').resolves(false);

		const response = await request
			.delete(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.send({ imagesToDelete })
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Insufficient permissions to delete images for pet'
		);
	});

	it('should return 404 if the pet is not found', async () => {
		const petId = '126';
		const imagesToDelete = ['image1.jpg'];

		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.onFirstCall().resolves({ rowCount: 0, rows: [] });

		const response = await request
			.delete(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.send({ imagesToDelete })
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Pet not found');
	});

	it('should handle errors gracefully', async () => {
		const petId = '127';
		const imagesToDelete = ['image1.jpg'];

		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.onFirstCall().rejects(new Error('Database connection failed'));

		const response = await request
			.delete(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.send({ imagesToDelete })
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('Failed to delete images');
	});
});
