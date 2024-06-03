// src/types/conversation.d.ts

export interface Conversation {
	conversation_id: string;
	started_by: string;
	started_at: string;
	last_message: string;
	last_message_at: string;
	last_message_by: string;
	pet_id: string;
	status: string;
	unread_messages: number;
	messages_count: number;
	created_at: string;
	updated_at: string;
	participant_emails: string[];
	participant_rescues: string[];
	started_by_email: string;
	last_message_by_email: string;
}

export interface Participant {
	email: string;
	name?: string;
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
