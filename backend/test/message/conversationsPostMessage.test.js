import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('POST /api/conversations/messages/:conversationId', () => {
	let sandbox, cookie, userToken, queryStub, releaseStub;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		queryStub = sandbox.stub();
		releaseStub = sandbox.stub().resolves();

		// Ensure only one stubbing per test
		sandbox.stub(pool, 'connect').resolves({
			query: queryStub,
			release: releaseStub,
		});

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId', isAdmin: false };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore(); // This will restore all stubs/spies created within the sandbox
	});

	it('should successfully create a new message in an existing conversation', async () => {
		queryStub
			.onFirstCall()
			.resolves({ command: 'BEGIN' })
			.onSecondCall()
			.resolves({
				rows: [
					{
						messageText: 'Hello',
						conversationId: '123',
						senderId: 'testUserId',
						sentAt: new Date(),
						status: 'sent',
					},
				],
			})
			.onThirdCall()
			.resolves({ rowCount: 1 })
			.onCall(3)
			.resolves({ command: 'COMMIT' });

		const response = await request
			.post('/api/conversations/messages/12345')
			.set('Cookie', cookie)
			.send({
				messageText: 'Hello',
				conversationId: '123',
				senderId: 'testUserId',
				sentAt: new Date(),
				status: 'sent',
			});

		expect(response.status).to.equal(201);
		// expect(response.body.message_text).to.equal('Hello');
	});

	it('should return 400 if message text is missing', async () => {
		const response = await request
			.post('/api/conversations/messages/12345')
			.set('Cookie', cookie)
			.send({
				conversationId: '123',
				senderId: 'testUserId',
				sentAt: new Date(),
				status: 'sent',
			});

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('"messageText" is required');
	});

	it('should handle database errors gracefully', async () => {
		// Resetting the stub to simulate a new behavior
		queryStub.reset();
		queryStub.rejects(new Error('Connection failed'));

		const response = await request
			.post('/api/conversations/messages/12345')
			.set('Cookie', cookie)
			.send({
				messageText: 'Hello',
				conversationId: '123',
				senderId: 'testUserId',
				sentAt: new Date(),
				status: 'sent',
			});

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('Connection failed');
	});
});
