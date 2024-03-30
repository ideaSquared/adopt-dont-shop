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

describe('Conversation Routes', function () {
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
			const mockParticipantReferences = [
				{
					participantId: mockUserId,
					participantType: 'User',
				},
				{
					participantId: '65f1fa3badeb2ca9f053f7f9',
					participantType: 'User',
				},
			];
			const mockStartedBy = mockUserId; // Assuming mockUserId is defined and valid
			const mockStartedAt = new Date();
			const mockStatus = 'active';
			const mockUnreadMessages = 0;
			const mockMessagesCount = 1;
			const mockLastMessage = ''; // Assuming empty string for initial lastMessage
			const mockLastMessageBy = mockUserId;
			const mockLastMessageAt = new Date();

			conversationMock.expects('create').resolves({
				participants: mockParticipantReferences,
				startedBy: mockStartedBy,
				startedAt: mockStartedAt,
				status: mockStatus,
				unreadMessages: mockUnreadMessages,
				messagesCount: mockMessagesCount,
				lastMessage: mockLastMessage,
				lastMessageAt: mockLastMessageAt,
				lastMessageBy: mockLastMessageBy,
			});

			const response = await request(app)
				.post('/api/conversations')
				.set('Cookie', cookie) // Use the simulated auth cookie for authentication
				.send({
					participants: mockParticipantReferences,
					// Include all required fields based on the updated route logic
					startedBy: mockStartedBy,
					startedAt: mockStartedAt,
					status: mockStatus,
					unreadMessages: mockUnreadMessages,
					messagesCount: mockMessagesCount,
					lastMessage: mockLastMessage,
					lastMessageAt: mockLastMessageAt,
					lastMessageBy: mockLastMessageBy,
				});

			expect(response.status).to.equal(201);
			conversationMock.verify();
		});

		it('should reject creating a new conversation with invalid participants', async () => {
			const invalidParticipants = ['justOne']; // Assuming at least 2 participants are required
			const mockSubject = 'Test Conversation';
			const mockStartedBy = mockUserId; // Assuming mockUserId is defined and valid
			const mockStartedAt = new Date();
			const mockStatus = 'active';
			const mockUnreadMessages = 0;
			const mockMessagesCount = 1;
			const mockLastMessage = ''; // Assuming empty string for initial lastMessage
			const mockLastMessageBy = mockUserId;
			const mockLastMessageAt = new Date();

			conversationMock.expects('create').resolves({
				participants: invalidParticipants,
				startedBy: mockStartedBy,
				startedAt: mockStartedAt,
				status: mockStatus,
				unreadMessages: mockUnreadMessages,
				messagesCount: mockMessagesCount,
				lastMessage: mockLastMessage,
				lastMessageAt: mockLastMessageAt,
				lastMessageBy: mockLastMessageBy,
			});

			const response = await request(app)
				.post('/api/conversations')
				.set('Cookie', cookie) // Use the simulated auth cookie for authentication
				.send({
					participants: invalidParticipants,
					// Include all required fields based on the updated route logic
					startedBy: mockStartedBy,
					startedAt: mockStartedAt,
					status: mockStatus,
					unreadMessages: mockUnreadMessages,
					messagesCount: mockMessagesCount,
					lastMessage: mockLastMessage,
					lastMessageAt: mockLastMessageAt,
					lastMessageBy: mockLastMessageBy,
				});

			expect(response.status).to.equal(400);
			// Adjusted to match the actual API response structure
			expect(response.body.message).to.contain(
				'"participants" should have at least 2 participants'
			);
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
					lastMessage: 'Existing Conversation',
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
					lastMessage: 'Existing Conversation',
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

	describe('GET /api/conversations/rescue', () => {
		it('should fetch all conversations for a user as part of a Rescue', async () => {
			const mockStartedAt = new Date('2024-03-30T10:33:54.995Z');
			const mockStatus = 'active';
			const mockUnreadMessages = 0;
			const mockMessagesCount = 1;
			const mockLastMessage = ''; // Assuming empty string for initial lastMessage
			const mockLastMessageBy = mockUserId;
			const mockLastMessageAt = new Date('2024-03-30T10:33:54.995Z');

			const mockConversations = [
				{
					participants: [
						{ participantId: mockUserId, participantType: 'Rescue' },
						{
							participantId: '65f1fa3badeb2ca9f053f7f9',
							participantType: 'User',
						},
					],
					startedBy: mockUserId,
					startedAt: mockStartedAt.toDateString(),
					status: mockStatus,
					unreadMessages: mockUnreadMessages,
					messagesCount: mockMessagesCount,
					lastMessage: mockLastMessage,
					lastMessageAt: mockLastMessageAt.toDateString(),
					lastMessageBy: mockLastMessageBy,
				},
			];

			conversationMock
				.expects('find')
				.withArgs({
					'participants.participantId': mockUserId,
					'participants.participantType': 'Rescue',
				})
				.resolves(mockConversations);

			const response = await request(app)
				.get('/api/conversations/rescue')
				.set('Cookie', cookie);

			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(mockConversations);
			conversationMock.verify();
		});

		it('should return 500 if there is a server error', async () => {
			conversationMock
				.expects('find')
				.withArgs({
					'participants.participantId': mockUserId,
					'participants.participantType': 'Rescue',
				})
				.rejects(new Error('Internal server error'));

			const response = await request(app)
				.get('/api/conversations/rescue')
				.set('Cookie', cookie);

			expect(response.status).to.equal(500);
			expect(response.body.message).to.contain('Internal server error');
			conversationMock.verify();
		});
	});

	describe('PUT /api/conversations/:conversationId', () => {
		it('should update a conversation successfully', async () => {
			const mockConversationId = generateObjectId().toString();
			const mockParticipants = [mockUserId, generateObjectId().toString()];
			const mockSubject = 'Updated Conversation Subject';

			conversationMock
				.expects('findById')
				.withArgs(mockConversationId)
				.resolves({
					_id: mockConversationId,
					participants: mockParticipants,
					lastMessage: 'Original Conversation Subject',
				});

			conversationMock
				.expects('findByIdAndUpdate')
				.withArgs(
					mockConversationId,
					{
						$set: { participants: mockParticipants, lastMessage: mockSubject },
					},
					{ new: true }
				)
				.resolves({
					_id: mockConversationId,
					participants: mockParticipants,
					lastMessage: mockSubject,
				});

			const response = await request(app)
				.put(`/api/conversations/${mockConversationId}`)
				.set('Cookie', cookie)
				.send({ participants: mockParticipants, lastMessage: mockSubject });

			expect(response.status).to.equal(200);
			expect(response.body.lastMessage).to.equal(mockSubject);
			conversationMock.verify();
		});

		/* TODO: Will verify with joi */
		// it('should return 400 for missing required fields', async () => {
		// 	const mockConversationId = generateObjectId().toString();

		// 	const response = await request(app)
		// 		.put(`/api/conversations/${mockConversationId}`)
		// 		.set('Cookie', cookie)
		// 		.send({}); // Missing participants and subject

		// 	expect(response.status).to.equal(400);
		// 	expect(response.body.message).to.contain('Missing required fields');
		// });

		it('should return 404 if the conversation does not exist', async () => {
			const nonExistentConversationId = generateObjectId().toString();

			conversationMock
				.expects('findById')
				.withArgs(nonExistentConversationId)
				.resolves(null);

			const response = await request(app)
				.put(`/api/conversations/${nonExistentConversationId}`)
				.set('Cookie', cookie)
				.send({ participants: [mockUserId], lastMessage: 'Should Fail' });

			expect(response.status).to.equal(404);
			conversationMock.verify();
		});

		it('should return 500 on internal server error', async () => {
			const mockConversationId = generateObjectId().toString();
			const mockParticipants = [mockUserId, generateObjectId().toString()];
			const mockSubject = 'Updated Conversation Subject';

			conversationMock
				.expects('findById')
				.withArgs(mockConversationId)
				.resolves({
					_id: mockConversationId,
					participants: mockParticipants,
					lastMessage: 'Original Conversation Subject',
				});

			conversationMock
				.expects('findByIdAndUpdate')
				.withArgs(
					mockConversationId,
					{
						$set: { participants: mockParticipants, lastMessage: mockSubject },
					},
					{ new: true }
				)
				.rejects(new Error('Internal server error'));

			const response = await request(app)
				.put(`/api/conversations/${mockConversationId}`)
				.set('Cookie', cookie)
				.send({ participants: mockParticipants, lastMessage: mockSubject });

			expect(response.status).to.equal(500);
			expect(response.body.message).to.contain('Internal server error');
			conversationMock.verify();
		});

		// Additional tests for authorization and validation logic can be added here
	});

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
					lastMessage: 'Existing Conversation',
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
					conversationId: mockConversationId,
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
					lastMessage: 'Existing Conversation',
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
