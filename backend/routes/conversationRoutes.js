import express from 'express';
// Import the Conversation and Message models you defined earlier.
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { pool } from '../dbConnection.js';
import format from 'pg-format';
import Sentry from '@sentry/node'; // Error tracking utility.
import authenticateToken from '../middleware/authenticateToken.js';
import Rescue from '../models/Rescue.js';
import { generateObjectId } from '../utils/generateObjectId.js';
import Pet from '../models/Pet.js';

import LoggerUtil from '../utils/Logger.js'; // Logging utility.
import {
	validateRequest,
	messageSchema,
	createConversationSchema,
} from '../middleware/joiValidateSchema.js';
const logger = new LoggerUtil('conversation-service').getLogger();

const router = express.Router();

// Middleware to check if the user is a participant in the conversation
async function checkParticipant(req, res, next) {
	const userId = req.user.userId; // Assuming `req.user` is populated by `authenticateToken` middleware
	const conversationId = req.params.conversationId;

	try {
		const conversationQuery = `
            SELECT * FROM conversations WHERE conversation_id = $1
        `;
		const conversationResult = await pool.query(conversationQuery, [
			conversationId,
		]);
		if (conversationResult.rowCount === 0) {
			logger.warn(`Conversation not found for ID: ${conversationId}`);
			return res.status(404).json({ message: 'Conversation not found' });
		}

		// Check if the user is a participant of the conversation
		const participantQuery = `
            SELECT 1 FROM participants 
            WHERE conversation_id = $1 AND user_id = $2
        `;
		const participantResult = await pool.query(participantQuery, [
			conversationId,
			userId,
		]);
		if (participantResult.rowCount === 0) {
			logger.warn(
				`User ${userId} is not a participant in conversation ${conversationId}`
			);
			return res
				.status(403)
				.json({ message: 'User is not a participant in this conversation' });
		}

		logger.info(
			`User ${userId} verified as participant in conversation ${conversationId}`
		);
		// User is a participant, proceed to the next middleware
		next();
	} catch (error) {
		logger.error(
			`Error in checkParticipant middleware for conversation ${conversationId}: ${error.message}`
		);
		Sentry.captureException(error);
		res.status(500).json({ message: error.message });
	}
}

// CRUD Routes for Conversations
// Create a new conversation
router.post('/', authenticateToken, async (req, res) => {
	console.log('Request body:', req.body);

	const { participants, petId } = req.body;

	if (
		!participants ||
		!Array.isArray(participants) ||
		participants.length < 2
	) {
		// Assuming at least 2 participants are required
		logger.warn('Invalid participants for new conversation');
		return res.status(400).json({ message: 'Invalid participants' });
	}

	console.log('Participants received:', participants);

	try {
		const client = await pool.connect(); // Start a database transaction
		try {
			await client.query('BEGIN');

			const newConversationQuery = `
                    INSERT INTO conversations (started_by, started_at, status, unread_messages, messages_count, pet_id, last_message, last_message_at, last_message_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING conversation_id;
                `;
			const values = [
				req.user.userId,
				new Date(),
				'active',
				0,
				0,
				petId,
				'',
				new Date(),
				req.user.userId,
			];
			const newConversationResult = await client.query(
				newConversationQuery,
				values
			);
			const conversationId = newConversationResult.rows[0].conversation_id;

			const participantValues = participants.map((p) => {
				if (p.participantType === 'User') {
					return [conversationId, p.userId, null, 'User']; // Assuming p.userId is provided for User
				} else if (p.participantType === 'Rescue') {
					return [conversationId, null, p.rescueId, 'Rescue']; // Assuming p.rescueId is provided for Rescue
				} else {
					// Handle unexpected participantType
					throw new Error('Invalid participant type');
				}
			});

			// Create a format string for participant insertion
			const participantQuery = format(
				'INSERT INTO participants (conversation_id, user_id, rescue_id, participant_type) VALUES %L',
				participantValues
			);

			console.log(participantQuery);

			await client.query(participantQuery); // Batch insert participants

			await client.query('COMMIT');

			logger.info(`New conversation created with ID: ${conversationId}`);
			res.status(201).json({
				id: conversationId,
				startedBy: req.user.userId,
				participants,
				startedAt: values[1],
				status: values[2],
				petId,
			});
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		logger.error(`Error creating conversation: ${error.message}`);
		Sentry.captureException(error);
		res.status(500).json({ message: error.message });
	}
});

// TODO: Tests + do we need to call for images or can we do this on another API call?
// Get all conversations for a user
router.get('/', authenticateToken, async (req, res) => {
	try {
		let query;
		let queryParams = [req.query.participantId]; // Parse participantId to ensure it's a number

		// Check if the request is specifically for 'Rescue' conversations
		if (req.query.type === 'Rescue') {
			query = `
                SELECT conversations.*, participants.participant_id, participants.participant_type, users.first_name, rescues.rescue_name FROM conversations
				JOIN participants ON conversations.conversation_id = participants.conversation_id
				LEFT JOIN users ON participants.participant_id = users.user_id
				JOIN rescues ON participants.rescue_id = rescues.rescue_id
				WHERE participants.rescue_id = $1 AND participants.participant_type = 'Rescue'
            `;
			// console.log('RESCUE CONVERSATIONS');
		} else {
			query = `
                SELECT conversations.*, participants.participant_id, participants.participant_type, users.first_name, rescues.rescue_name FROM conversations
				JOIN participants ON conversations.conversation_id = participants.conversation_id
				JOIN users ON participants.user_id = users.user_id
				LEFT JOIN rescues ON participants.rescue_id = rescues.rescue_id
				WHERE participants.user_id = $1 AND participants.participant_type = 'User'
            `;
			queryParams = [req.user.userId];
			// console.log('USER CONVERSATIONS');
		}

		const conversationsResult = await pool.query(query, queryParams);
		const conversations = conversationsResult.rows;

		const logMessage =
			req.query.type === 'Rescue'
				? `Fetched all conversations for rescue organization with ID ${queryParams[0]}`
				: `Fetched all conversations for user with ID ${queryParams[0]}`;
		logger.info(logMessage);
		// console.log('CONVERS', conversationsResult);
		res.json(conversations);
	} catch (error) {
		logger.error(`Error fetching conversations: ${error.message}`);
		Sentry.captureException(error);
		res
			.status(500)
			.json({ message: 'An error occurred while fetching conversations.' });
	}
});

// Get a specific conversation by ID, using middleware to check if user is a participant
router.get(
	'/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		try {
			const conversationId = req.params.conversationId;
			const query = 'SELECT * FROM conversations WHERE conversation_id = $1';
			const result = await pool.query(query, [conversationId]);
			if (result.rowCount === 0) {
				logger.error(`Conversation not found with ID: ${conversationId}`);
				return res.status(404).json({ message: 'Conversation not found' });
			}
			const conversation = result.rows[0];

			logger.info(`Fetched conversation with ID: ${conversationId}`);
			res.json(conversation);
		} catch (error) {
			logger.error(`Error fetching specific conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// !!! DEPRECIATED: We only update the conversation internally through other routes, so no need to maintain this.
// Update a conversation (e.g., add a new participant)
// router.put('/:conversationId', authenticateToken, async (req, res) => {
// 	const { participants, lastMessage, lastMessageAt, lastMessageBy } = req.body;
// 	const conversationId = req.params.conversationId;

// 	try {
// 		// Construct the update object based on provided fields
// 		const updatePayload = {};
// 		if (participants !== undefined) updatePayload.participants = participants;
// 		if (lastMessage !== undefined) updatePayload.lastMessage = lastMessage;
// 		if (lastMessageAt !== undefined)
// 			updatePayload.lastMessageAt = lastMessageAt;
// 		if (lastMessageBy !== undefined)
// 			updatePayload.lastMessageBy = lastMessageBy;

// 		const updatedConversation = await Conversation.findByIdAndUpdate(
// 			conversationId,
// 			{ $set: updatePayload },
// 			{ new: true }
// 		);

// 		if (!updatedConversation) {
// 			return res.status(404).json({ message: 'Conversation not found' });
// 		}

// 		logger.info(`Updated conversation with ID: ${updatedConversation._id}`);
// 		res.json(updatedConversation);
// 	} catch (error) {
// 		logger.error(`Error updating conversation: ${error.message}`);
// 		Sentry.captureException(error);
// 		res.status(500).json({ message: error.message });
// 	}
// });

// Delete a conversation
router.delete('/:conversationId', authenticateToken, async (req, res) => {
	try {
		const conversationId = req.params.conversationId;
		const deleteQuery = 'DELETE FROM conversations WHERE conversation_id = $1';
		const result = await pool.query(deleteQuery, [conversationId]);
		if (result.rowCount === 0) {
			logger.warn(
				`No conversation found with ID: ${conversationId} to delete.`
			);
			return res.status(404).json({ message: 'Conversation not found' });
		}
		logger.info(`Deleted conversation with ID: ${conversationId}`);
		res.status(204).end();
	} catch (error) {
		logger.error(`Error deleting conversation: ${error.message}`);
		Sentry.captureException(error);
		res.status(500).json({ message: error.message });
	}
});

// CRUD Routes for Messages within a Conversation
// Create a new message in a conversation
router.post(
	'/messages/:conversationId',
	authenticateToken,
	validateRequest(messageSchema),
	async (req, res) => {
		const { messageText } = req.body;
		const conversationId = req.params.conversationId;
		const userId = req.user.userId;
		const currentDateTime = new Date();

		if (!messageText) {
			return res.status(400).json({ message: 'Message text is required' });
		}

		try {
			// Start a transaction for message creation and conversation update
			const client = await pool.connect();
			try {
				await client.query('BEGIN');

				// Create a new message document in the database.
				const newMessageQuery = `
                    INSERT INTO messages (conversation_id, sender_id, message_text, sent_at, status)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
				const messageValues = [
					conversationId,
					userId,
					messageText,
					currentDateTime,
					'sent',
				];
				const newMessageResult = await client.query(
					newMessageQuery,
					messageValues
				);
				const newMessage = newMessageResult.rows[0];

				// Log the successful creation of a new message.
				logger.info(
					`New message created in conversation ID: ${conversationId} by user ID: ${userId}`
				);

				// Update the corresponding conversation document.
				const updateConversationQuery = `
                    UPDATE conversations
                    SET last_message = $1, last_message_at = $2, last_message_by = $3, 
                        unread_messages = unread_messages + 1, messages_count = messages_count + 1
                    WHERE conversation_id = $4
                    RETURNING *;
                `;
				const updateValues = [
					messageText,
					currentDateTime,
					userId,
					conversationId,
				];
				const updatedConversationResult = await client.query(
					updateConversationQuery,
					updateValues
				);

				if (updatedConversationResult.rowCount === 0) {
					await client.query('ROLLBACK');
					return res.status(404).json({ message: 'Conversation not found' });
				}

				// Log the successful update of the conversation.
				logger.info(
					`Conversation updated in conversation ID: ${conversationId} by user ID: ${userId}`
				);

				await client.query('COMMIT');
				// Respond with the newly created message.
				res.status(201).json(newMessage);
			} catch (error) {
				await client.query('ROLLBACK');
				throw error;
			} finally {
				client.release();
			}
		} catch (error) {
			logger.error(`Error creating message in conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Get all messages in a conversation
router.get('/messages/:conversationId', authenticateToken, async (req, res) => {
	try {
		const conversationId = req.params.conversationId;

		// Assuming you have a join table or a way to identify messages and senders,
		// This query will fetch messages and join them with the user's details (rescueName, firstName)
		const messagesQuery = `
            SELECT 
                m.*, 
                u.first_name AS sender_name,
                u.user_id AS sender_id
            FROM 
                messages m
            JOIN 
                users u ON m.sender_id = u.user_id
            WHERE 
                m.conversation_id = $1;
        `;
		const messagesResult = await pool.query(messagesQuery, [conversationId]);

		logger.info(`Fetched all messages for conversation ID: ${conversationId}`);

		const modifiedMessages = messagesResult.rows.map((message) => ({
			...message,
			senderName: message.sender_name || 'Unknown Sender',
			senderId: message.sender_id || null,
		}));

		res.json(modifiedMessages);
	} catch (error) {
		logger.error(`Error fetching messages for conversation: ${error.message}`);
		Sentry.captureException(error);
		res.status(500).json({ message: error.message });
	}
});

// Update route for reading messages in a conversation
router.put(
	'/messages/read/:conversationId',
	authenticateToken,
	async (req, res) => {
		const userId = req.user.userId; // Assuming userId is added to req.user
		const { userType } = req.body;
		const conversationId = req.params.conversationId;
		let userParticipants;

		try {
			logger.info(
				`Attempting to mark messages as read for conversationId: ${conversationId} by userId: ${userId}`
			);

			let query = `
                UPDATE messages 
                SET status = 'read', read_at = NOW()
                WHERE conversation_id = $1 AND status = 'sent'
            `;

			if (userType === 'User') {
				query += ` AND sender_id != $2`;
			} else if (userType === 'Rescue') {
				// Fetch participants to identify users
				const participantQuery = `
                    SELECT user_id FROM participants
                    WHERE conversation_id = $1 AND participant_type = 'User'
                `;
				const participantsResult = await pool.query(participantQuery, [
					conversationId,
				]);
				userParticipants = participantsResult.rows.map((row) => row.user_id);

				query += ` AND sender_id = ANY($2)`;
			} else {
				return res.status(400).json({ message: 'Invalid user type' });
			}

			const result = await pool.query(query, [
				conversationId,
				userType === 'User' ? userId : userParticipants,
			]);

			logger.info(`Messages updated, modified: ${result.rowCount}`);

			// Update the conversation's unreadMessages count
			const updateConversationQuery = `
                UPDATE conversations
                SET unread_messages = unread_messages - $2
                WHERE conversation_id = $1
            `;
			await pool.query(updateConversationQuery, [
				conversationId,
				result.rowCount,
			]);

			res.status(200).json({
				message: 'Messages marked as read',
				updated: result.rowCount,
			});
		} catch (error) {
			logger.error(`Error marking messages as read: ${error}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Updating or deleting messages can follow a similar pattern, with additional checks
// to ensure that the user performing the action is the message sender.

// Make sure to export the router to use it in your main application file.
export default router;
