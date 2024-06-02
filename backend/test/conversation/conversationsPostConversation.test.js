import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('POST /api/conversations', () => {
	let sandbox, cookie, userToken;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		const queryStub = sandbox.stub();
		const releaseStub = sandbox.stub();
		sandbox.stub(pool, 'connect').resolves({
			query: queryStub,
			release: releaseStub,
		});

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId', isAdmin: false };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

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

		queryStub.onFirstCall().resolves();
		queryStub
			.onSecondCall()
			.resolves({ rows: [{ conversation_id: mockNewConversationId }] });
		queryStub.onThirdCall().resolves();
		queryStub.onCall(3).resolves();

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
			participants: [],
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

		queryStub.rejects(new Error('Database Error'));

		const response = await request
			.post('/api/conversations')
			.set('Cookie', cookie)
			.send(requestPayload);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Database Error');
	});
});
