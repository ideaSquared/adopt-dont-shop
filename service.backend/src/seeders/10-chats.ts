import Chat from '../models/Chat';
import { ChatStatus } from '../types/chat';

const chatData = [
  {
    chat_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    status: ChatStatus.ACTIVE,
  },
  {
    chat_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    application_id: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    status: ChatStatus.ARCHIVED,
  },
  {
    chat_id: '807793ed-dc1e-4bbc-a035-d9033a3378bf',
    application_id: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002',
    status: ChatStatus.ACTIVE,
  },
  {
    chat_id: 'a8ce10ca-8043-4d1c-a1c8-c453b3d9f4dd',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    status: ChatStatus.ACTIVE,
  },
];

export async function seedChats() {
  for (const chat of chatData) {
    await Chat.findOrCreate({
      paranoid: false,
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
