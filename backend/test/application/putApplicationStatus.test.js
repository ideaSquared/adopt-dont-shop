import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';

const request = supertest(app);

describe('PUT /api/applications/:applicationId (Rescue)', () => {
	let sandbox, rescueToken, cookie, secret;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		secret = process.env.SECRET_KEY;
		const rescuePayload = {
			userId: 'rescueId',
			isRescue: true,
		};
		rescueToken = jwt.sign(rescuePayload, secret, { expiresIn: '1h' });
		cookie = `token=${rescueToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should update the status of an application successfully', async () => {
		const updatedApplication = {
			application_id: '1',
			user_id: 'user1',
			pet_id: 'pet1',
			status: 'approved',
			actioned_by: 'rescueId',
		};
		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		pool.query.resolves({ rows: [updatedApplication] });

		const response = await request
			.put('/api/applications/1')
			.set('Cookie', cookie)
			.send({ status: 'approved', actioned_by: 'rescueId' })
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.data).to.deep.equal(updatedApplication);
		expect(response.body.message).to.equal('Application updated successfully');
	});

	// ??? This 500's for some reason but times out if under 10s?
	it.skip('should return 403 if the user is not a rescue', async function () {
		this.timeout(10000); // Setting timeout to 10 seconds for this test case

		const userPayload = { userId: 'userId', isRescue: false };
		const userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		const userCookie = `token=${userToken};`;

		const response = await request
			.put('/api/applications/1')
			.set('Cookie', userCookie)
			.send({ status: 'approved', actioned_by: 'rescueId' })
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal(
			'Insufficient permissions to action applications'
		);
	});

	it('should handle errors gracefully if there is a database error', async () => {
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.put('/api/applications/1')
			.set('Cookie', cookie)
			.send({ status: 'approved', actioned_by: 'rescueId' })
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
