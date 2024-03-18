// Import the mongoose library to interact with MongoDB.
import mongoose from 'mongoose';

// Destructure Schema from mongoose to avoid repeating mongoose.Schema.
const { Schema } = mongoose;

/**
 * Schema definition for the Conversation model.
 *
 * This schema defines the structure of conversation documents in the MongoDB database,
 * which includes fields for participants, the conversation starter, timestamps, message details,
 * subject, status, and message counts.
 */
const conversationSchema = new mongoose.Schema({
	// Array of participant references. Each participant is referenced by their ObjectId in the User collection.
	participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	// Reference to the User who started the conversation. It is required for every conversation document.
	startedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	// Timestamp indicating when the conversation was started. It is required for every conversation document.
	startedAt: { type: Date, required: true },
	// The content of the last message in the conversation. Required to quickly show recent activity without fetching all messages.
	lastMessage: { type: String, required: false },
	// Timestamp for the last message sent in the conversation. Helps in sorting or displaying recent conversations.
	lastMessageAt: { type: Date, required: false },
	// Reference to the User who sent the last message. It is required to identify the author of the last message quickly.
	lastMessageBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	// An optional subject for the conversation. Useful for giving context or a brief about the conversation's purpose.
	subject: { type: String },
	// The status of the conversation, restricted to either 'active' or 'closed'. Helps in managing conversation lifecycle.
	status: { type: String, required: true, enum: ['active', 'closed'] },
	// Count of unread messages in the conversation, required to notify participants of new messages since they last checked.
	unreadMessages: { type: Number, required: true },
	// Total count of messages within the conversation. Useful for pagination or displaying the extent of conversations.
	messagesCount: { type: Number, required: true },
});

// Export the Conversation model, making it available for use throughout the application.
// This model will interact with the 'conversations' collection in MongoDB.
export default mongoose.model('Conversation', conversationSchema);
