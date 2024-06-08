import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('PUT /api/applications/:applicationId (Rescue)', () => {
	let sandbox, rescueToken, cookie, secret;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		secret = process.env.SECRET_KEY;
		const rescuePayload = { userId: 'rescueId', isRescue: true };
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

	it('should return 403 if the user is not a rescue', async () => {
		const userPayload = { userId: 'userId', isRescue: false };
		const userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		const userCookie = `token=${userToken};`;

		const response = await request
			.put('/api/applications/1')
			.set('Cookie', userCookie)
			.send({ status: 'approved', actioned_by: 'rescueId' })
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Forbidden');
	});

	it('should handle errors gracefully if there is a database error', async () => {
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
