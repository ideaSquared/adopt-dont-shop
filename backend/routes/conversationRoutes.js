import express from 'express';
// Import the Conversation and Message models you defined earlier.
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Sentry from '@sentry/node'; // Error tracking utility.
import authenticateToken from '../middleware/authenticateToken.js';
import Rescue from '../models/Rescue.js';
import { generateObjectId } from '../utils/generateObjectId.js';

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
router.post(
	'/',
	authenticateToken,
	validateRequest(createConversationSchema),
	async (req, res) => {
		const { participants, pet } = req.body;
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
				status: 'active',
				unreadMessages: 0,
				messagesCount: 0,
				lastMessage: '',
				lastMessageAt: new Date(),
				lastMessageBy: req.user.userId,
			});
			if (pet) {
				conversationData.pet = generateObjectId(pet); // Assuming `pet` is the ObjectId of the pet
			}
			logger.info(`New conversation created with ID: ${newConversation._id}`);
			res.status(201).json(newConversation);
		} catch (error) {
			logger.error(`Error creating conversation: ${error.message}`);
			Sentry.captureException(error);
			res.status(500).json({ message: error.message });
		}
	}
);

// TODO: Check the tests work for this
// Get all conversations for a user
router.get('/', authenticateToken, async (req, res) => {
	try {
		let rescue;
		let query = {};

		// Check if the request is specifically for 'Rescue' conversations
		if (req.query.type === 'Rescue') {
			rescue = await Rescue.findOne({ 'staff.userId': req.user.userId });
			if (!rescue) {
				return res
					.status(404)
					.json({ message: 'Rescue organization not found for the user.' });
			}

			query = {
				'participants.participantId': rescue._id,
				'participants.participantType': 'Rescue',
			};
		} else {
			query = {
				'participants.participantId': req.user.userId,
				'participants.participantType': 'User',
			};
		}

		const conversations = await Conversation.find(query)
			.populate({
				path: 'participants.participantId',
				select: 'rescueName firstName -_id', // assuming you want names and excluding _id in selection
			})
			.exec();

		const logMessage =
			req.query.type === 'Rescue'
				? `Fetched all conversations for rescue organization with ID ${rescue._id}`
				: 'Fetched all conversations for user';
		logger.info(logMessage);
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
			// Create a new message document in the database.
			const newMessage = await Message.create({
				conversationId,
				senderId: userId,
				messageText,
				sentAt: currentDateTime,
				status: 'sent',
			});

			// Log the successful creation of a new message.
			logger.info(
				`New message created in conversation ID: ${conversationId} by user ID: ${userId}`
			);

			// Update the corresponding conversation document.
			const updatedConversation = await Conversation.findByIdAndUpdate(
				conversationId,
				{
					$set: {
						lastMessage: messageText,
						lastMessageAt: currentDateTime,
						lastMessageBy: userId,
					},
					$inc: {
						unreadMessages: 1,
						messagesCount: 1,
					},
				},
				{ new: true } // Return the updated document.
			);

			logger.info(
				`Conversation updated in conversation ID: ${conversationId} by user ID: ${userId}`
			);

			// Check if the conversation update was successful.
			if (!updatedConversation) {
				return res.status(404).json({ message: 'Conversation not found' });
			}

			// Respond with the newly created message.
			res.status(201).json(newMessage);
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
		const messages = await Message.find({
			conversationId: req.params.conversationId,
		}).populate({
			path: 'senderId', // Assuming senderId is a reference to the User model
			select: 'firstName _id', // Fetch the firstName field along with the _id
		});

		logger.info(
			`Fetched all messages for conversation ID: ${req.params.conversationId}`
		);

		const modifiedMessages = messages.map((message) => {
			const messageObj = message.toObject();

			// Modify the messageObj to include senderName and keep senderId
			if (messageObj.senderId) {
				// Include senderName for ease of display
				messageObj.senderName = messageObj.senderId.firstName;
				// Keep senderId in the response
				messageObj.senderId = messageObj.senderId._id; // This ensures senderId is just the ID, not the populated object
			} else {
				// Handle the case where senderId could not be populated
				messageObj.senderName = 'Unknown Sender';
				messageObj.senderId = null; // Explicitly set senderId to null if not available
			}

			return messageObj;
		});

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
		const { userId } = req.user;
		const { conversationId } = req.params;

		try {
			logger.info(
				`Attempting to mark messages as read for conversationId: ${conversationId} by userId: ${userId}`
			);

			// Step 1: Count unread messages for the user in this conversation
			const unreadCount = await Message.countDocuments({
				conversationId,
				senderId: { $ne: userId },
				status: 'sent',
			});

			logger.info(`Unread messages to mark as read: ${unreadCount}`);

			// Step 2: Mark the unread messages as read
			const result = await Message.updateMany(
				{ conversationId, senderId: { $ne: userId }, status: 'sent' },
				{ $set: { status: 'read', readAt: new Date() } }
			);

			logger.info(`Messages updated, modified: ${result.nModified}`);

			// Step 3: Update the conversation's unreadMessages count
			if (unreadCount > 0) {
				await Conversation.findByIdAndUpdate(conversationId, {
					$inc: { unreadMessages: -unreadCount },
				});
			}

			res.status(200).json({
				message: 'Messages marked as read',
				updated: result.nModified,
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
