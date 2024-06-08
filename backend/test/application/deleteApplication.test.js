import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('DELETE /api/applications/:applicationId (Admin + Rescue + User)', () => {
	let sandbox, adminToken, rescueToken, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY;
		const adminPayload = { userId: 'adminId', isAdmin: true };
		const rescuePayload = { userId: 'rescueId', isRescue: true };
		const userPayload = { userId: 'userId' };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		rescueToken = jwt.sign(rescuePayload, secret, { expiresIn: '1h' });
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should delete an application successfully for admin', async () => {
		cookie = `token=${adminToken};`;
		pool.query
			.onFirstCall()
			.resolves({ rows: [{ application_id: '1', user_id: 'user1' }] });
		pool.query.onSecondCall().resolves();

		const response = await request
			.delete('/api/applications/1')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Application deleted successfully');
	});

	it('should delete an application successfully for rescue', async () => {
		cookie = `token=${rescueToken};`;
		pool.query
			.onFirstCall()
			.resolves({ rows: [{ application_id: '1', user_id: 'user1' }] });
		pool.query.onSecondCall().resolves();

		const response = await request
			.delete('/api/applications/1')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Application deleted successfully');
	});

	it('should delete an application successfully for the user themselves', async () => {
		cookie = `token=${userToken};`;
		pool.query
			.onFirstCall()
			.resolves({ rows: [{ application_id: '1', user_id: 'userId' }] });
		pool.query.onSecondCall().resolves();

		const response = await request
			.delete('/api/applications/1')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Application deleted successfully');
	});

	it('should return 403 if the user is not authorized', async () => {
		const anotherUserPayload = { userId: 'anotherUserId' };
		const anotherUserToken = jwt.sign(
			anotherUserPayload,
			process.env.SECRET_KEY,
			{ expiresIn: '1h' }
		);
		const anotherUserCookie = `token=${anotherUserToken};`;

		pool.query
			.onFirstCall()
			.resolves({ rows: [{ application_id: '1', user_id: 'user1' }] });

		const response = await request
			.delete('/api/applications/1')
			.set('Cookie', anotherUserCookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Forbidden');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		cookie = `token=${adminToken};`;
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.delete('/api/applications/1')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
