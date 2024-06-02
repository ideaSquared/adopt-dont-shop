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
	participants: Participant[];
	rescue_id?: string;
	rescue_name?: string;
}

export interface Participant {
	email: string;
	name: string;
}

export interface Message {
	sender_id: string;
	sender_name: string;
	message_text: string;
	sent_at: string;
	status: string;
}

export interface ConversationsTableConversation {
	conversation_id: string;
	participant_emails: string[];
	rescue_name?: string;
	last_message_by_email: string;
	updated_at: string;
	status?: string;
}
