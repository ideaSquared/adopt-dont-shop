import mongoose from 'mongoose';

const messageSchema = new Schema({
	conversationId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Conversation',
	},
	senderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	messageText: { type: String, required: true },
	sentAt: { type: Date, required: true },
	readAt: { type: Date },
	attachments: [
		{
			type: { type: String, required: true },
			url: { type: String, required: true },
			description: { type: String },
		},
	],
	status: { type: String, required: true, enum: ['sent', 'delivered', 'read'] },
});

export default mongoose.model('Message', messageSchema);
