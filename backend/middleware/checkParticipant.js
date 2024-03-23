import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';

// Middleware to check if the user is a participant in the conversation
async function checkParticipant(req, res, next) {
	const userId = req.user?.userId; // Assuming `req.user` is populated by `authenticateToken` middleware
	const conversationId = req.params.conversationId;

	try {
		const conversation = await Conversation.findById(conversationId);
		if (!conversation) {
			return res.status(404).json({ message: 'Conversation not found' });
		}

		// Check if the user is a participant of the conversation
		const isParticipant = conversation.participants.some((participant) =>
			participant.equals(userId)
		);

		if (!isParticipant) {
			return res
				.status(403)
				.json({ message: 'User is not a participant in this conversation' });
		}

		// User is a participant, proceed to the next middleware
		next();
	} catch (error) {
		console.log(error.message);
		res.status(500).json({ message: error.message });
	}
}

export default checkParticipant;
