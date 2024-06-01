// src/types/conversation.d.ts

export interface Conversation {
	conversation_id: string;
	sender_id: string;
	pet_id: string;
	status: string;
	pet_name: string;
	last_message: string;
	last_message_by: string;
	last_message_at: string;
	unread_messages: number;
	first_name: string;
	rescue_name: string;
}
