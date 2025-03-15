import { QueryInterface } from 'sequelize'
import { Message, User } from '../Models'

export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    // Get all existing messages and users for references
    const messages = await Message.findAll({ attributes: ['message_id'] })
    const users = await User.findAll({ attributes: ['user_id'] })

    if (messages.length === 0 || users.length === 0) {
      console.log('No messages or users found, skipping reaction seeding')
      return
    }

    // Common emoji reactions
    const emojis = ['👍', '❤️', '😂', '😍', '👏', '🔥', '🎉', '🤔', '😊', '🙌']

    // Generate random reactions (about 30% of messages will have reactions)
    const reactions = []
    const messagesWithReactions = messages
      .sort(() => 0.5 - Math.random()) // Shuffle the array
      .slice(0, Math.floor(messages.length * 0.3)) // Take 30% of messages

    for (const message of messagesWithReactions) {
      // Each message with reactions will have 1-3 different emojis
      const reactionCount = Math.floor(Math.random() * 3) + 1

      // Select random emojis for this message
      const messageEmojis = emojis
        .sort(() => 0.5 - Math.random())
        .slice(0, reactionCount)

      for (const emoji of messageEmojis) {
        // Each emoji will have 1-3 users reacting with it
        const userCount = Math.floor(Math.random() * 3) + 1

        // Select random users for this emoji
        const reactingUsers = users
          .sort(() => 0.5 - Math.random())
          .slice(0, userCount)

        for (const user of reactingUsers) {
          reactions.push({
            reaction_id: `reaction_${Math.random()
              .toString(36)
              .substring(2, 15)}`,
            message_id: message.message_id,
            user_id: user.user_id,
            emoji,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }
    }

    // Insert all reactions in batches
    if (reactions.length > 0) {
      await queryInterface.bulkInsert('message_reactions', reactions)
      console.log(`Seeded ${reactions.length} message reactions`)
    }
  } catch (error) {
    console.error('Error seeding message reactions:', error)
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('message_reactions', {})
  console.log('Removed all message reactions')
}
