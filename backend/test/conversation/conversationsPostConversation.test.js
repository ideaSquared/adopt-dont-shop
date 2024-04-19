import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
// import logger from '../path/to/your/logger';
// import Sentry from '@sentry/node';

const request = supertest(app);

describe('POST /api/conversations', () => {
	let sandbox, cookie, userToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		// Simulating pool connection and query handling
		const queryStub = sandbox.stub();
		const releaseStub = sandbox.stub();
		sandbox.stub(pool, 'connect').resolves({
			query: queryStub,
			release: releaseStub,
		});

		// Setup JWT and cookie for a user
		const secret = process.env.SECRET_KEY; // Your JWT secret should be consistent
		const userPayload = { userId: 'testUserId', isAdmin: false };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

		// Setup mock behavior for each test
		global.queryStub = queryStub;
		global.releaseStub = releaseStub;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should create a new conversation successfully', async () => {
		const mockParticipants = [
			{ participantType: 'User', userId: '12345' },
			{ participantType: 'User', userId: '67890' },
		];
		const mockPetId = 'pet123';
		const mockNewConversationId = 'conv456';

		const requestPayload = {
			participants: mockParticipants,
			petId: mockPetId,
		};

		// Mock the database response for successful insertion
		queryStub.onFirstCall().resolves(); // Simulate BEGIN transaction
		queryStub
			.onSecondCall()
			.resolves({ rows: [{ conversation_id: mockNewConversationId }] }); // INSERT conversation
		queryStub.onThirdCall().resolves(); // INSERT participants
		queryStub.onCall(3).resolves(); // COMMIT transaction

		const response = await request
			.post('/api/conversations')
			.set('Cookie', cookie)
			.send(requestPayload);

		expect(response.status).to.equal(201);
		expect(response.body).to.include({
			id: mockNewConversationId,
		});
	});

	it('should return 400 if participants are invalid', async () => {
		const requestPayload = {
			participants: [], // Invalid empty array
			petId: 'pet123',
		};

		const response = await request
			.post('/api/conversations')
			.set('Cookie', cookie)
			.send(requestPayload);

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('Invalid participants');
	});

	it('should handle database errors during conversation creation', async () => {
		const requestPayload = {
			participants: [
				{ participantType: 'User', userId: '12345' },
				{ participantType: 'User', userId: '67890' },
			],
			petId: 'pet123',
		};

		// Simulate a database error
		queryStub.rejects(new Error('Database Error'));

		const response = await request
			.post('/api/conversations')
			.set('Cookie', cookie)
			.send(requestPayload);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Database Error');
	});
});
