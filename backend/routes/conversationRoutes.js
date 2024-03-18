import express from 'express';
// Import the Conversation and Message models you defined earlier.
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import authenticateToken from '../middleware/authenticateToken.js';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to check if the user is a participant in the conversation
const checkParticipant = async (req, res, next) => {
	const { userId } = req.user;
	const { conversationId } = req.params;

	if (!mongoose.Types.ObjectId.isValid(conversationId)) {
		return res.status(400).json({ message: 'Invalid conversation ID format.' });
	}

	try {
		const conversation = await Conversation.findById(conversationId);
		if (!conversation || !conversation.participants.includes(userId)) {
			return res
				.status(403)
				.json({ message: 'User is not a participant in the conversation.' });
		}
		next();
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// CRUD Routes for Conversations
// Create a new conversation
router.post('/', authenticateToken, async (req, res) => {
	const { participants, subject } = req.body;
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
		res.status(201).json(newConversation);
	} catch (error) {
		console.log(error.message);
		res.status(500).json({ message: error.message });
	}
});

// Get all conversations for a user
router.get('/', authenticateToken, async (req, res) => {
	try {
		const conversations = await Conversation.find({
			participants: req.user.userId,
		});
		res.json(conversations);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Get a specific conversation by ID
router.get(
	'/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		try {
			const conversation = await Conversation.findById(
				req.params.conversationId
			);
			res.json(conversation);
		} catch (error) {
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
		const { participants } = req.body;
		try {
			const updatedConversation = await Conversation.findByIdAndUpdate(
				req.params.conversationId,
				{ participants },
				{ new: true }
			);
			res.json(updatedConversation);
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}
);

// Delete a conversation
router.delete(
	'/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		try {
			await Conversation.findByIdAndDelete(req.params.conversationId);
			res.status(204).end();
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}
);

// CRUD Routes for Messages within a Conversation
// Create a new message in a conversation
router.post(
	'/messages/:conversationId',
	authenticateToken,
	checkParticipant,
	async (req, res) => {
		const { messageText, attachments } = req.body;
		try {
			const newMessage = await Message.create({
				conversationId: req.params.conversationId,
				senderId: req.user.userId,
				recipientId: null, // This needs to be determined based on the conversation participants and logic
				messageText,
				sentAt: new Date(),
				attachments,
				status: 'sent',
			});
			res.status(201).json(newMessage);
		} catch (error) {
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
			res.json(messages);
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}
);

// Updating or deleting messages can follow a similar pattern, with additional checks
// to ensure that the user performing the action is the message sender.

// Make sure to export the router to use it in your main application file.
export default router;
