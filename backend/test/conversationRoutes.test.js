// conversationRoutes.test.js
import request from 'supertest';
import sinon from 'sinon';
import express from 'express';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import conversationRoutes from '../routes/conversationRoutes.js';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import app from '../index.js';
import { generateObjectId } from '../utils/generateObjectId.js';

const mockObjectId = '65f1fa2aadeb2ca9f053f7f8';
const mockUserId = generateObjectId().toString();

describe.only('Conversation Routes', function () {
	let conversationMock, messageMock;
	const token = 'dummyToken'; // Simulate an auth token.
	const cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.
	const unauthorizedCookie = `token=unauth`;

	beforeEach(async () => {
		await connectToDatabase();
		conversationMock = sinon.mock(Conversation);
		messageMock = sinon.mock(Message);
		sinon.stub(jwt, 'verify');

		jwt.verify.callsFake((token, secret, callback) => {
			callback(null, { userId: mockUserId, isAdmin: false });
		});
	});

	afterEach(async () => {
		await disconnectFromDatabase();
		conversationMock.restore();
		messageMock.restore();
		sinon.restore();
	});

	describe('POST /api/conversations', () => {
		it('should create a new conversation', async () => {
			const mockParticipants = [mockUserId, '65f1fa3badeb2ca9f053f7f9'];
			const mockSubject = 'Test Conversation';

			conversationMock.expects('create').resolves({
				participants: mockParticipants,
				subject: mockSubject,
				// additional fields
			});

			const response = await request(app)
				.post('/api/conversations')
				.set('Cookie', cookie) // Use the simulated auth cookie for authentication
				.send({ participants: mockParticipants, subject: mockSubject });

			expect(response.status).to.equal(201);
			conversationMock.verify();
		});

		it('should reject creating a new conversation with invalid participants', async () => {
			const invalidParticipants = ['justOne']; // Assuming at least 2 participants are required
			const mockSubject = 'Invalid Test Conversation';

			const response = await request(app)
				.post('/api/conversations')
				.set('Cookie', cookie)
				.send({ participants: invalidParticipants, subject: mockSubject });

			expect(response.status).to.equal(400);
			// Adjusted to match the actual API response structure
			expect(response.body.message).to.contain('Invalid participants');
		});
	});

	describe('GET /api/conversations/:conversationId', () => {
		it('should retrieve a specific conversation by ID', async () => {
			const mockConversationId = generateObjectId().toString();

			conversationMock
				.expects('findById')
				.withArgs(mockConversationId)
				.twice() // Expect the call twice
				.resolves({
					_id: mockConversationId,
					subject: 'Existing Conversation',
					participants: [mockUserId.toString(), generateObjectId().toString()],
				});

			const response = await request(app)
				.get(`/api/conversations/${mockConversationId}`)
				.set('Cookie', cookie); // Use the simulated auth cookie for authentication

			expect(response.status).to.equal(200);
			conversationMock.verify();
		});

		// Unauthorized Access to a Conversation
		it('should deny access to a conversation for unauthorized user', async () => {
			const mockConversationId = generateObjectId().toString();

			conversationMock
				.expects('findById')
				.withArgs(mockConversationId)
				.resolves({
					_id: mockConversationId,
					subject: 'Existing Conversation',
					participants: [generateObjectId(), generateObjectId()],
				});

			const response = await request(app)
				.get(`/api/conversations/${mockConversationId}`)
				.set('Cookie', unauthorizedCookie);

			expect(response.status).to.equal(403);
		});

		// Non-existent Conversation Retrieval
		it('should return 404 when trying to retrieve a non-existent conversation', async () => {
			const nonExistentConversationId = generateObjectId().toString();

			const response = await request(app)
				.get(`/api/conversations/${nonExistentConversationId}`)
				.set('Cookie', cookie);

			expect(response.status).to.equal(404);
		});
	});

	// Similar structure for PUT and DELETE tests

	describe('POST /api/conversations/messages/:conversationId', () => {
		it('should create a new message in a conversation', async () => {
			const mockConversationId = generateObjectId().toString();
			const mockMessageText = 'Hello World';
			const mockSenderId = mockUserId;
			const mockDate = Date.now();
			const status = 'sent';

			conversationMock
				.expects('findById')
				.withArgs(mockConversationId)
				.twice() // Expect the call twice
				.resolves({
					_id: mockConversationId,
					subject: 'Existing Conversation',
					participants: [mockSenderId, generateObjectId()],
				});

			messageMock.expects('create').resolves({
				conversationId: mockConversationId,
				senderId: mockSenderId,
				sentAt: mockDate,
				messageText: mockMessageText,
				status: status,
			});

			const response = await request(app)
				.post(`/api/conversations/messages/${mockConversationId}`)
				.set('Cookie', cookie) // Use the simulated auth cookie for authentication
				.send({
					messageText: mockMessageText,
					senderId: mockSenderId,
					sentAt: mockDate,
					status: status,
				});

			expect(response.status).to.equal(201);
			messageMock.verify();
		});

		it('should not allow message creation from a non-participant', async () => {
			const mockConversationId = generateObjectId().toString();
			const mockMessageText = 'Unauthorized Hello World';

			conversationMock
				.expects('findById')
				.withArgs(mockConversationId)
				.resolves({
					_id: mockConversationId,
					subject: 'Existing Conversation',
					participants: [generateObjectId(), generateObjectId()],
				});

			const response = await request(app)
				.post(`/api/conversations/messages/${mockConversationId}`)
				.set('Cookie', unauthorizedCookie)
				.send({ messageText: mockMessageText });

			expect(response.status).to.equal(403);
		});

		// Additional tests for message retrieval, updating, deleting, etc.
	});

	// Tests for updating and deleting messages, access control, and error handling
});
