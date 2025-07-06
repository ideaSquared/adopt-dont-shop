import { QueryInterface } from 'sequelize';
import { logger } from '../utils/logger';

interface UserRow {
  user_id: string;
}

interface PetRow {
  pet_id: string;
}

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  // Get some sample users and pets for seeding
  const [users] = await queryInterface.sequelize.query('SELECT user_id FROM users LIMIT 5');

  const [pets] = await queryInterface.sequelize.query(
    "SELECT pet_id FROM pets WHERE status = 'available' LIMIT 20"
  );

  if (users.length === 0 || pets.length === 0) {
    logger.info('Skipping swipe sessions seeder - no users or pets found');
    return;
  }

  const swipeSessions = [];
  const now = new Date();

  // Create 10 sample sessions
  for (let i = 0; i < 10; i++) {
    const startTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last 7 days
    const endTime = new Date(startTime.getTime() + Math.random() * 60 * 60 * 1000); // Random session length up to 1 hour
    const randomUser = (users as UserRow[])[Math.floor(Math.random() * users.length)];

    swipeSessions.push({
      session_id: `session_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: randomUser?.user_id || null,
      start_time: startTime,
      end_time: Math.random() > 0.3 ? endTime : null, // 30% chance of ongoing session
      total_swipes: Math.floor(Math.random() * 50) + 1,
      total_likes: Math.floor(Math.random() * 20),
      total_passes: Math.floor(Math.random() * 30),
      total_super_likes: Math.floor(Math.random() * 5),
      total_info_views: Math.floor(Math.random() * 10),
      filters_used: JSON.stringify({
        type: Math.random() > 0.5 ? 'dog' : 'cat',
        ageGroup: ['baby', 'young', 'adult', 'senior'][Math.floor(Math.random() * 4)],
        size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
      }),
      device_info: JSON.stringify({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'web',
        screenSize: '1920x1080',
      }),
      created_at: startTime,
      updated_at: endTime || startTime,
    });
  }

  await queryInterface.bulkInsert('swipe_sessions', swipeSessions);
  logger.info(`Seeded ${swipeSessions.length} swipe sessions`);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.bulkDelete('swipe_sessions', {}, {});
};
