import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';
// import multer from 'multer';

const request = supertest(app);

describe('POST /api/pets/:id/images endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		// Stub multer to bypass actual file uploading
		// sandbox.stub(multer, 'array').callsFake(() => (req, res, next) => {
		// 	req.files = [
		// 		{ filename: 'test-image.jpg' },
		// 		{ filename: 'test-image2.jpg' },
		// 	];
		// 	next();
		// });

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should upload images successfully when permissions are granted and pet exists', async () => {
		const petId = '123';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query
			.onFirstCall()
			.resolves({ rows: [{ pet_id: petId, images: [] }], rowCount: 1 });
		pool.query.onSecondCall().resolves({
			rows: [{ pet_id: petId, images: ['test-image.jpg', 'test-image2.jpg'] }],
			rowCount: 1,
		});

		const response = await request
			.post(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.attach('images', Buffer.from('fake image data'), 'test-image.jpg')
			.attach('images', Buffer.from('fake image data'), 'test-image2.jpg')
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Images uploaded successfully');
		expect(response.body.data.images).to.include.members([
			'test-image.jpg',
			'test-image2.jpg',
		]);
	});

	it('should return 403 if the user does not have permission to upload images', async () => {
		const petId = '124';
		sandbox.stub(permissionService, 'checkPermission').resolves(false);

		const response = await request
			.post(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Insufficient permissions to upload images for pet'
		);
	});

	it('should return 404 if the pet is not found', async () => {
		const petId = '125';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.onFirstCall().resolves({ rowCount: 0, rows: [] });

		const response = await request
			.post(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Pet not found');
	});

	it('should handle errors gracefully', async () => {
		const petId = '126';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.onFirstCall().rejects(new Error('Database connection failed'));

		const response = await request
			.post(`/api/pets/${petId}/images`)
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('Failed to upload images');
	});
});
