import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/conversations/messages/:conversationId', () => {
	let sandbox, cookie, userToken, authenticateTokenStub;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		authenticateTokenStub = sandbox.stub();

		// Stubbing the authentication middleware
		app.use((req, res, next) => {
			authenticateTokenStub(req, res, next);
			next();
		});

		// Mock pool.query for database interaction
		sandbox.stub(pool, 'query').resolves({
			rows: [
				{
					message_id: 'msg1',
					sender_id: 'user123',
					conversation_id: 'conv1',
					message_text: 'Hello',
					sender_name: 'John Doe',
				},
			],
		});

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId', isAdmin: false };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

		// Global stubs for logger and Sentry (defined in your app context)
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

	it('should fetch all messages for a given conversationId successfully', async () => {
		const conversationId = 'conv1';
		const response = await request
			.get(`/api/conversations/messages/${conversationId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.be.an('array').that.is.not.empty;
		expect(response.body[0]).to.include.all.keys([
			'message_id',
			'sender_id',
			'sender_name',
			'message_text',
		]);
		// expect(logger.info.calledOnce).to.be.true;
	});

	it('should handle cases where no messages exist for the conversation', async () => {
		pool.query.resolves({ rows: [] }); // No messages found
		const conversationId = 'conv2';
		const response = await request
			.get(`/api/conversations/messages/${conversationId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.be.an('array').that.is.empty;
	});

	it("should return an error response if there's a problem accessing the database", async () => {
		const conversationId = 'conv3';
		pool.query.rejects(new Error('Database error')); // Simulating a database error

		const response = await request
			.get(`/api/conversations/messages/${conversationId}`)
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('Database error');
		// expect(Sentry.captureException.calledOnce).to.be.true;
		// expect(logger.error.calledOnce).to.be.true;
	});
});
