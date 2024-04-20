import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('PUT /api/conversations/messages/read/:conversationId', () => {
	let sandbox, cookie, userToken, authenticateTokenStub;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		authenticateTokenStub = sandbox.stub();

		// Stubbing the authentication middleware
		app.use((req, res, next) => {
			authenticateTokenStub(req, res, next);
			req.user = { userId: 'testUserId' }; // Simulating user object on request
			next();
		});

		// Stubbing pool.query
		sandbox.stub(pool, 'query').resolves({
			rowCount: 1,
		});

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId', isAdmin: false };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

		// Global stubs for logger and Sentry
		// global.logger = {
		// 	info: sandbox.stub(),
		// 	error: sandbox.stub(),
		// };
		// global.Sentry = {
		// 	captureException: sandbox.stub(),
		// };
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should mark messages as read successfully for a regular user', async () => {
		const conversationId = 'conv1';
		const response = await request
			.put(`/api/conversations/messages/read/${conversationId}`)
			.set('Cookie', cookie)
			.send({ userType: 'User' });

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Messages marked as read');
		expect(response.body.updated).to.equal(1);
		expect(pool.query.calledTwice).to.be.true; // Checks if database was queried twice
	});

	it('should not update messages when an invalid user type is provided', async () => {
		const conversationId = 'conv2';
		const response = await request
			.put(`/api/conversations/messages/read/${conversationId}`)
			.set('Cookie', cookie)
			.send({ userType: 'InvalidType' });

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('Invalid user type');
		expect(pool.query.notCalled).to.be.true;
	});

	it('should handle database errors gracefully', async () => {
		const conversationId = 'conv3';
		pool.query.onFirstCall().rejects(new Error('Database error'));

		const response = await request
			.put(`/api/conversations/messages/read/${conversationId}`)
			.set('Cookie', cookie)
			.send({ userType: 'User' });

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('Database error');
		// expect(Sentry.captureException.calledOnce).to.be.true;
		// expect(logger.error.calledOnce).to.be.true;
	});

	it('should handle specific logic for rescue user type', async () => {
		const conversationId = 'conv4';
		pool.query
			.onFirstCall()
			.resolves({ rows: [{ user_id: 'user2' }, { user_id: 'user3' }] }); // Staff query response

		const response = await request
			.put(`/api/conversations/messages/read/${conversationId}`)
			.set('Cookie', cookie)
			.send({ userType: 'Rescue' });

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Messages marked as read');
		expect(response.body.updated).to.equal(1);
		expect(pool.query.calledThrice).to.be.true; // Should query thrice including staff fetch
	});
});
