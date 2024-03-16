// Import the mongoose library for creating schemas and interacting with MongoDB.
import mongoose from 'mongoose';

// Destructure Schema from mongoose to simplify references in the schema definition.
const { Schema } = mongoose;

/**
 * Schema definition for the Message model.
 *
 * This schema outlines the structure of message documents in the MongoDB database,
 * which includes references to the conversation and the users involved, the message content,
 * timestamps for when the message was sent and read, attachments, and the message status.
 */
const messageSchema = new mongoose.Schema({
	// Reference to the Conversation this message belongs to. It is required for associating messages with their respective conversations.
	conversationId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Conversation',
	},
	// Reference to the User who sent this message. It is required to track the message sender.
	senderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	// Reference to the User who is the recipient of this message. It is required to deliver the message appropriately.
	recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	// The text content of the message. This field is required for every message document.
	messageText: { type: String, required: true },
	// The timestamp indicating when the message was sent. This is required for sorting and displaying messages chronologically.
	sentAt: { type: Date, required: true },
	// The timestamp indicating when the message was read by the recipient. This field is optional as not all messages may be read immediately.
	readAt: { type: Date },
	// An array of attachments that may accompany the message. Each attachment includes its type, URL, and an optional description.
	attachments: [
		{
			type: { type: String, required: true }, // The type of attachment, e.g., image, video, etc. The field name is 'type' inside an object, hence the nesting.
			url: { type: String, required: true }, // The URL where the attachment is stored. Required for accessing the attachment.
			description: { type: String }, // An optional description of the attachment for additional context.
		},
	],
	// The status of the message, which can be 'sent', 'delivered', or 'read'. This helps in tracking the message's lifecycle.
	status: { type: String, required: true, enum: ['sent', 'delivered', 'read'] },
});

// Export the Message model, making it available for CRUD operations and queries.
// This model will interact with the 'messages' collection in MongoDB.
export default mongoose.model('Message', messageSchema);
