import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/conversations/:conversationId', () => {
	let sandbox, authenticateToken, checkParticipant;
	let userToken, userPayload, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		authenticateToken = sandbox.stub(); // Stub the authentication middleware
		checkParticipant = sandbox.stub(); // Stub the participant check middleware
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY; // Ensure your JWT secret is correctly configured
		userPayload = { userId: 'adminUserId' }; // Adapt payload to match expected in your route
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

	it('should fetch a specific conversation by ID successfully', async () => {
		const mockConversation = {
			conversation_id: 1,
			topic: 'Upcoming Event',
		};
		pool.query.resolves({ rowCount: 1, rows: [mockConversation] });

		const response = await request
			.get('/api/conversations/1') // Adjust the endpoint as necessary
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockConversation);
	});

	it('should return 404 if the conversation is not found', async () => {
		pool.query.resolves({ rowCount: 0, rows: [] });

		const response = await request
			.get('/api/conversations/999') // Adjust the endpoint as necessary
			.set('Cookie', cookie);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Conversation not found');
	});

	it('should handle errors during fetching the conversation', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.get('/api/conversations/1') // Adjust the endpoint as necessary
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Database Error');
	});

	// Additional tests can be added here to check for authorization and participant verification failures
	// e.g., tests simulating unauthorized access or attempting access by a non-participant
});
