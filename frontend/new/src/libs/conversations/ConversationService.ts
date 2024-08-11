// src/libs/conversations/ConversationService.ts

import { Conversation } from './Conversation';

const conversations: Conversation[] = [
	{
		conversation_id: '1',
		started_by: 'John Doe',
		started_at: '2024-08-01T10:00:00Z',
		last_message: 'Is Max still available?',
		last_message_at: '2024-08-01T12:00:00Z',
		last_message_by: 'John Doe',
		pet_id: '101',
		status: 'open',
		unread_messages: 2,
		messages_count: 10,
		created_at: '2024-08-01T10:00:00Z',
		updated_at: '2024-08-01T12:00:00Z',
		participant_emails: ['john@example.com'],
		participant_rescues: ['Rescue Org'],
		started_by_email: 'john@example.com',
		last_message_by_email: 'john@example.com',
	},
	{
		conversation_id: '2',
		started_by: 'Jane Smith',
		started_at: '2024-08-02T11:30:00Z',
		last_message: 'I would like to adopt Bella.',
		last_message_at: '2024-08-02T13:00:00Z',
		last_message_by: 'Jane Smith',
		pet_id: '102',
		status: 'closed',
		unread_messages: 0,
		messages_count: 15,
		created_at: '2024-08-02T11:30:00Z',
		updated_at: '2024-08-02T13:00:00Z',
		participant_emails: ['jane@example.com'],
		participant_rescues: ['Rescue Org'],
		started_by_email: 'jane@example.com',
		last_message_by_email: 'jane@example.com',
	},
];

const getConversations = (): Conversation[] => conversations;

const getConversationById = (id: string): Conversation | undefined =>
	conversations.find((conversation) => conversation.conversation_id === id);

export default {
	getConversations,
	getConversationById,
};
