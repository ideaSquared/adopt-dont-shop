import express from 'express';
// Import the Conversation and Message models you defined earlier.
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Sentry from '@sentry/node'; // Error tracking utility.
import authenticateToken from '../middleware/authenticateToken.js';

import LoggerUtil from '../utils/Logger.js'; // Logging utility.
const logger = new LoggerUtil('conversation-service').getLogger();

const router = express.Router();

// Middleware to check if the user is a participant in the conversation
async function checkParticipant(req, res, next) {
	const userId = req.user.userId; // Assuming `req.user` is populated by `authenticateToken` middleware
	const conversationId = req.params.conversationId;

	try {
		const conversation = await Conversation.findById(conversationId);
		if (!conversation) {
			logger.warn(`Conversation not found for ID: ${conversationId}`);
			return res.status(404).json({ message: 'Conversation not found' });
		}

		// Check if the user is a participant of the conversation
		const isParticipant = conversation.participants.some(
			(participant) => participant.toString() === userId.toString()
		);

		if (!isParticipant) {
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
	const { participants, subject } = req.body;
	if (
		!participants ||
		!Array.isArray(participants) ||
		participants.length < 2
	) {
		// Assuming at least 2 participants are required
		logger.warn('Invalid participants for new conversation');
		return res.status(400).json({ message: 'Invalid participants' });
	}
	try {
		const newConversation = await Conversation.create({
			participants,
			startedBy: req.user.userId,
			startedAt: new Date(),
			subject,
			status: 'active',
			unreadMessages: 0,
			messagesCount: 0,
			lastMessage: '',
			lastMessageAt: new Date(),
			lastMessageBy: req.user.userId,
		});
		logger.info(`New conversation created with ID: ${newConversation._id}`);
		res.status(201).json(newConversation);
	} catch (error) {
		logger.error(`Error creating conversation: ${error.message}`);
		Sentry.captureException(error);
		res.status(500).json({ message: error.message });
	}
});

// Get all conversations for a user
router.get('/', authenticateToken, checkParticipant, async (req, res) => {
	try {
		const conversations = await Conversation.find({
			participants: req.user.userId,
		});
		logger.info('Fetched all conversations for user');
		res.json(conversations);
	} catch (error) {
		logger.error(`Error fetching conversations: ${error.message}`);
		Sentry.captureException(error);
		res.status(500).json({ message: error.message });
	}
});

// Get a specific conversation by ID, using middleware to check if user is a participant
router.get(
	'/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		try {
			const conversationId = req.params.conversationId; // This should be a string from the URL params.
			const conversation = await Conversation.findById(conversationId); // Assuming findById can handle string input directly.

			logger.info(`Fetched conversation with ID: ${conversation._id}`);
			res.json(conversation); // Send the conversation as a response
		} catch (error) {
			logger.error(`Error fetching specific conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Update a conversation (e.g., add a new participant)
router.put(
	'/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		const { participants, subject } = req.body;
		const userId = req.user.userId?.userId; // Assuming `req.user` is populated by `authenticateToken` middleware
		const conversationId = req.params.conversationId;

		try {
			// Perform the update
			const updatedFields = { participants, subject };
			const updatedConversation = await Conversation.findByIdAndUpdate(
				conversationId,
				{ $set: updatedFields },
				{ new: true }
			);

			logger.info(`Updated conversation with ID: ${updatedConversation._id}`);
			res.json(updatedConversation);
		} catch (error) {
			logger.error(`Error updating conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);
// Delete a conversation
router.delete('/:conversationId', authenticateToken, async (req, res) => {
	try {
		await Conversation.findByIdAndDelete(req.params.conversationId);
		logger.info(`Deleted conversation with ID: ${req.params.conversationId}`);
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
	checkParticipant,
	async (req, res) => {
		const { messageText } = req.body;
		const conversationId = req.params.conversationId;
		const userId = req.user.userId;

		if (!messageText) {
			return res.status(400).json({ message: 'Message text is required' });
		}

		try {
			const newMessage = await Message.create({
				conversationId,
				senderId: userId,
				messageText,
				sentAt: new Date(),
				status: 'sent',
			});

			logger.info(
				`New message created in conversation ID: ${conversationId} by user ID: ${userId}`
			);
			res.status(201).json(newMessage);
		} catch (error) {
			logger.error(`Error creating message in conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Get all messages in a conversation
router.get(
	'/messages/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		try {
			const messages = await Message.find({
				conversationId: req.params.conversationId,
			});
			logger.info(
				`Fetched all messages for conversation ID: ${req.params.conversationId}`
			);
			res.json(messages);
		} catch (error) {
			logger.error(
				`Error fetching messages for conversation: ${error.message}`
			);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// Updating or deleting messages can follow a similar pattern, with additional checks
// to ensure that the user performing the action is the message sender.

// Make sure to export the router to use it in your main application file.
export default router;
