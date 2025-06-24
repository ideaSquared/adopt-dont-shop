import Chat from '../models/Chat';

const chatData = [
  {
    chat_id: 'chat_buddy_john_001',
    application_id: 'app_buddy_john_001',
    rescue_id: 'rescue_pawsrescue_001',
    status: 'active' as const,
  },
  {
    chat_id: 'chat_whiskers_emily_001',
    application_id: 'app_whiskers_emily_001',
    rescue_id: 'rescue_furryfriendspdx_001',
    status: 'archived' as const,
  },
  {
    chat_id: 'chat_rocky_michael_001',
    application_id: 'app_rocky_michael_001',
    rescue_id: 'rescue_happytails_001',
    status: 'active' as const,
  },
  {
    chat_id: 'chat_general_inquiry_001',
    application_id: null,
    rescue_id: 'rescue_pawsrescue_001',
    status: 'active' as const,
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

  console.log(`✅ Created ${chatData.length} chat conversations`);
}
