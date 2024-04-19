import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('GET /api/conversations', () => {
	let sandbox, authenticateToken, adminToken, adminPayload, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		authenticateToken = sandbox.stub(); // Stub the middleware for authentication

		const secret = process.env.SECRET_KEY; // Ensure your JWT secret is correctly configured
		adminPayload = { userId: 'adminUserId' }; // Adapt payload to match expected in your route
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		cookie = `token=${adminToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should fetch conversations for a Rescue organization', async () => {
		const mockConversations = [
			{
				conversation_id: 1,
				topic: 'Rescue Plans',
			},
		];
		pool.query.resolves({ rows: mockConversations });

		const response = await request
			.get('/api/conversations')
			.query({ participantId: '123', type: 'Rescue' })
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockConversations);
	});

	it('should fetch conversations for a User', async () => {
		const mockConversations = [
			{
				conversation_id: 2,
				topic: 'Adoption Process',
			},
		];
		pool.query.resolves({ rows: mockConversations });

		const response = await request
			.get('/api/conversations')
			.query({ userId: adminPayload.userId, type: 'User' }) // ensure this matches the actual query params your route expects
			.set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(mockConversations);
	});

	it('should handle errors in fetching conversations', async () => {
		pool.query.rejects(new Error('Database Error'));

		const response = await request
			.get('/api/conversations')
			.query({ participantId: '123', type: 'Rescue' })
			.set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'An error occurred while fetching conversations.'
		);
	});

	// Add more test cases as needed for different query parameters and error handling
});
