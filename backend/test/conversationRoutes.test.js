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
const mockUserId = generateObjectId();
const mockOtherUserId = generateObjectId();

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
			const mockUserId = 'someUserId'; // Simulated userId from the authenticated user
			const mockParticipants = [
				{ participantId: mockUserId, participantType: 'User' },
				{ participantId: 'anotherUserId', participantType: 'User' },
			];

			// Set up the mock expectation for the Conversation.create method
			conversationMock.expects('create').once().resolves({
				_id: 'mockConversationId',
				participants: mockParticipants,
				startedBy: mockUserId,
				startedAt: new Date(),
				status: 'active',
				unreadMessages: 0,
				messagesCount: 1,
				lastMessage: '',
				lastMessageAt: new Date(),
				lastMessageBy: mockUserId,
			});

			// Assume jwt.verify is correctly setting req.user.userId
			// This would be part of your authenticated middleware which might need to be mocked
			// if it's not globally applied or if you're not using a tool like proxyquire.

			const response = await request(app)
				.post('/api/conversations')
				.set('Cookie', cookie) // Simulate sending the cookie with the auth token
				.send({ participants: mockParticipants }) // Send the required participants in the body
				.expect(201); // Assert that the server responds with a 201 Created status

			// Assert the response body contains the expected properties
			expect(response.body).to.include.keys('_id', 'participants', 'startedBy');
			expect(response.body.participants).to.deep.equal(mockParticipants);
			expect(response.body.startedBy).to.equal(mockUserId);

			// Verify that the mocked interaction has happened
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

	describe('POST /api/conversations/messages/:conversationId', function () {
		it('should create a message successfully and update the conversation', async () => {
			const userId = generateObjectId();
			const senderId = mockUserId; // Assuming mockUserId is available and valid
			const conversation = await Conversation.create({
				participants: [
					{ participantId: mockUserId, participantType: 'User' },
					{ participantId: generateObjectId(), participantType: 'User' },
				],
				startedAt: new Date(),
				startedBy: mockUserId,
				status: 'active',
				unreadMessages: 0,
				messagesCount: 0, // Initial messagesCount should be 0 before creating a new message
				lastMessage: '',
				lastMessageAt: null,
				lastMessageBy: mockUserId,
			});

			const messageText = 'Hello, world!';
			const sentAt = new Date();
			const status = 'sent'; // Example status, adjust based on your application's requirements
			const response = await request(app)
				.post(`/api/conversations/messages/${conversation._id}`)
				.set('Cookie', cookie)
				.send({
					conversationId: conversation._id,
					senderId,
					messageText,
					sentAt,
					status,
				}) // Include all required fields
				.expect(201);

			expect(response.body).to.have.property('messageText', messageText);

			const updatedConversation = await Conversation.findById(conversation._id);
			expect(updatedConversation.messagesCount).to.equal(1); // Expect messagesCount to be incremented
			expect(updatedConversation.lastMessage).to.equal(messageText);
		});

		it('should return 400 for message creation with missing message text', async () => {
			const userId = generateObjectId();
			const senderId = mockUserId; // Assuming mockUserId is available and valid
			const conversation = await Conversation.create({
				participants: [
					{ participantId: mockUserId, participantType: 'User' },
					{ participantId: generateObjectId(), participantType: 'User' },
				],
				startedAt: new Date(),
				startedBy: mockUserId,
				status: 'active',
				unreadMessages: 0,
				messagesCount: 0, // Initial messagesCount should be 0 before creating a new message
				lastMessage: '',
				lastMessageAt: null,
				lastMessageBy: mockUserId,
			});

			const messageText = 'Hello, world!';
			const sentAt = new Date();
			const status = 'sent'; // Example status, adjust based on your application's requirements

			const response = await request(app)
				.post(`/api/conversations/messages/${conversation._id}`)
				.set('Cookie', cookie)
				.send({
					conversationId: conversation._id,
					senderId,
					sentAt,
					status,
				}) // Include all required fields
				.expect(400);

			expect(response.body).to.have.property(
				'message',
				'"messageText" is required'
			);
		});

		it('should return 404 for message creation in a non-existent conversation', async () => {
			const conversationId = generateObjectId(); // Ensure this ID does not exist in your database
			const senderId = generateObjectId(); // Dummy senderId for the purpose of this test
			const messageText = 'This should fail';
			const sentAt = new Date();
			const status = 'sent'; // Example status
			const response = await request(app)
				.post(`/api/conversations/messages/${conversationId}`)
				.set('Cookie', cookie)
				.send({ conversationId, senderId, messageText, sentAt, status }) // Include all required fields
				.expect(404);

			expect(response.body).to.have.property(
				'message',
				'Conversation not found'
			);
		});
	});
	// Tests for updating and deleting messages, access control, and error handling
});
