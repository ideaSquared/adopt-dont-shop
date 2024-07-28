// src/types/conversation.d.ts

type ID = string;
type Timestamp = string;
type Email = string;
type Status = string;

export interface Conversation {
	conversation_id: ID;
	started_by: string;
	started_at: Timestamp;
	last_message: string;
	last_message_at: Timestamp;
	last_message_by: string;
	pet_id: ID;
	status: Status;
	unread_messages: number;
	messages_count: number;
	created_at: Timestamp;
	updated_at: Timestamp;
	participant_emails: Email[];
	participant_rescues: string[];
	started_by_email: Email;
	last_message_by_email: Email;
}

export interface Participant {
	email: Email;
	name?: string;
}

export interface Message {
	sender_id: ID;
	sender_name: string;
	message_text: string;
	sent_at: Timestamp;
	status: Status;
}

export interface ConversationsTableConversation {
	conversation_id: ID;
	participant_emails: Email[];
	rescue_name?: string;
	last_message_by_email: Email;
	updated_at: Timestamp;
	status?: Status;
}
