import express from 'express';
import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import app from '../index.js'; // Your Express app
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { generateObjectId } from '../utils/generateObjectId.js';

describe.only('Conversation and Message Routes', function () {
	let cookie;

	before(async () => {
		await connectToDatabase();
		sinon.stub(jwt, 'verify');
	});

	after(async () => {
		await disconnectFromDatabase();
		sinon.restore();
	});

	beforeEach(function () {
		sinon.resetBehavior();
		sinon.resetHistory();
		const token = 'dummyToken';
		cookie = `token=${token};`;
		jwt.verify.callsFake((token, secret, callback) => {
			callback(null, { userId: generateObjectId(), isAdmin: false });
		});
	});

	describe('Conversations', function () {
		it.only('should create a new conversation', async function () {
			const participants = [generateObjectId(), generateObjectId()];
			const subject = 'Test Subject';

			const res = await request(app)
				.post('/api/conversations')
				.set('Cookie', cookie)
				.send({ participants, subject })
				.expect(201);

			expect(res.body).to.include.keys('participants', 'subject', 'startedBy');
			// Convert ObjectId to string for comparison
			const expectedParticipantIds = participants.map((participant) =>
				participant.toString()
			);
			const actualParticipantIds = res.body.participants.map((participant) =>
				participant.toString()
			);
			expect(actualParticipantIds).to.have.members(expectedParticipantIds);
			expect(res.body.subject).to.equal(subject);
		});

		it('should retrieve all conversations for a user', async function () {
			const res = await request(app)
				.get('/api/conversations')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).to.be.an('array');
		});

		it('should update a conversation', async function () {
			// Assume a conversation ID and new subject
			const conversationId = generateObjectId();
			const newSubject = 'Updated Subject';

			const res = await request(app)
				.put(`/api/conversations/${conversationId}`)
				.set('Cookie', cookie)
				.send({ subject: newSubject })
				.expect(200);

			expect(res.body).to.have.property('subject', newSubject);
		});

		it('should delete a conversation', async function () {
			const conversationId = generateObjectId();

			const res = await request(app)
				.delete(`/api/conversations/${conversationId}`)
				.set('Cookie', cookie)
				.expect(204);
		});
	});

	describe('Messages', function () {
		it('should create a new message in a conversation', async function () {
			const conversationId = generateObjectId();
			const messageText = 'Test Message';

			const res = await request(app)
				.post(`/api/conversations/messages/${conversationId}`)
				.set('Cookie', cookie)
				.send({ messageText })
				.expect(201);

			expect(res.body).to.include.keys(
				'conversationId',
				'messageText',
				'senderId'
			);
			expect(res.body.conversationId).to.equal(conversationId);
			expect(res.body.messageText).to.equal(messageText);
		});

		it('should retrieve all messages in a conversation', async function () {
			const conversationId = generateObjectId();

			const res = await request(app)
				.get(`/api/conversations/messages/${conversationId}`)
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).to.be.an('array');
		});

		// Add tests for updating and deleting messages similar to the above,
		// ensuring proper authorization checks and functionality.
	});

	// Additional tests for error handling, edge cases, and security concerns
	// should also be considered.
});
