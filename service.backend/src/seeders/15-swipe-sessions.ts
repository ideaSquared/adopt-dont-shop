import { QueryInterface } from 'sequelize';
import { logger } from '../utils/logger';
import { insertWithPgUuid } from '../utils/uuid-helpers';

interface UserRow {
  user_id: string;
}

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  // Get some sample users for seeding
  const [users] = await queryInterface.sequelize.query('SELECT user_id FROM users LIMIT 5');

  if (users.length === 0) {
    logger.info('Skipping swipe sessions seeder - no users found');
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
      user_id: randomUser?.user_id || null,
      start_time: startTime,
      end_time: Math.random() > 0.3 ? endTime : null, // 30% chance of ongoing session
      total_swipes: Math.floor(Math.random() * 50) + 1,
      likes: Math.floor(Math.random() * 20),
      passes: Math.floor(Math.random() * 30),
      super_likes: Math.floor(Math.random() * 5),
      filters: JSON.stringify({
        type: Math.random() > 0.5 ? 'dog' : 'cat',
        ageGroup: ['baby', 'young', 'adult', 'senior'][Math.floor(Math.random() * 4)],
        size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
      }),
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      device_type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
      is_active: Math.random() > 0.3 ? false : true, // 30% chance of active session
      created_at: startTime,
      updated_at: endTime || startTime,
    });
  }

  // Use PostgreSQL's gen_random_uuid() for generating session_id
  await insertWithPgUuid(queryInterface, 'swipe_sessions', swipeSessions, 'session_id');
  logger.info(`Seeded ${swipeSessions.length} swipe sessions`);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.bulkDelete('swipe_sessions', {}, {});
};
