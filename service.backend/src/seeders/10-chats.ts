import Chat from '../models/Chat';
import { ChatStatus } from '../types/chat';

const chatData = [
  {
    chat_id: 'chat_0000bjon001',
    application_id: 'application_0000bjon001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    status: ChatStatus.ACTIVE,
  },
  {
    chat_id: 'chat_0000wemi001',
    application_id: 'application_0000wemi001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    status: ChatStatus.ARCHIVED,
  },
  {
    chat_id: 'chat_0000rmic001',
    application_id: 'application_0000rmic001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002',
    status: ChatStatus.ACTIVE,
  },
  {
    chat_id: 'chat_0000genr001',
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
