import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe.only('DELETE /api/conversations/:conversationId', () => {
	let sandbox, cookie, userToken, checkParticipant;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		checkParticipant = sandbox.stub(); // Stub the participant check middleware

		// Set up JWT and cookie for an admin user
		const secret = process.env.SECRET_KEY; // Your JWT secret should be consistent
		const userPayload = { userId: 'userId', isAdmin: true };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

		checkParticipant.callsFake((req, res, next) => {
			next();
		});
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should delete a conversation successfully', async () => {
		const deletionResult = {
			rowCount: 1,
			rows: [{ conversation_id: '1' }],
		};
		pool.query.resolves(deletionResult);

		const response = await request
			.delete('/api/conversations/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Conversation deleted successfully');
		// sinon.assert.calledWith(logger.info, 'Deleted conversation with ID: 1');
	});

	it('should return 404 if the conversation does not exist', async () => {
		pool.query.resolves({ rowCount: 0 });

		const response = await request
			.delete('/api/conversations/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Conversation not found');
		// sinon.assert.calledWith(logger.warn, 'Conversation with ID: 1 not found');
	});

	it('should return 500 if there is an error deleting the conversation', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.delete('/api/conversations/1')
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Database Error');
		// sinon.assert.calledWith(
		// 	logger.error,
		// 	'Error deleting conversation: Database Error'
		// );
		// sinon.assert.calledWith(
		// 	Sentry.captureException,
		// 	sinon.match.instanceOf(Error)
		// );
	});

	// Additional tests here could include checking for correct authorization,
	// for example attempting to delete a conversation without a valid token or insufficient privileges
});
