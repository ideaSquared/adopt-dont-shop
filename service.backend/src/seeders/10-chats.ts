import Chat from '../models/Chat';
import { ChatStatus } from '../types/chat';

const chatData = [
  {
    chat_id: 'chat_buddy_john_001',
    application_id: 'app_buddy_john_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    status: ChatStatus.ACTIVE,
  },
  {
    chat_id: 'chat_whiskers_emily_001',
    application_id: 'app_whiskers_emily_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    status: ChatStatus.ARCHIVED,
  },
  {
    chat_id: 'chat_rocky_michael_001',
    application_id: 'app_rocky_michael_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002',
    status: ChatStatus.ACTIVE,
  },
  {
    chat_id: 'chat_general_inquiry_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    status: ChatStatus.ACTIVE,
  },
];

export async function seedChats() {
  for (const chat of chatData) {
    await Chat.findOrCreate({
      where: { chat_id: chat.chat_id },
      defaults: {
        ...chat,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${chatData.length} chat conversations`);
}
