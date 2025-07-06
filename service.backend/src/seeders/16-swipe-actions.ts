import { QueryInterface } from 'sequelize';
import { logger } from '../utils/logger';

interface SessionRow {
  session_id: string;
}

interface PetRow {
  pet_id: string;
}

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  // Get some sample sessions and pets for seeding
  const [sessions] = await queryInterface.sequelize.query(
    'SELECT session_id FROM swipe_sessions LIMIT 10'
  );

  const [pets] = await queryInterface.sequelize.query(
    "SELECT pet_id FROM pets WHERE status = 'available' LIMIT 50"
  );

  if (sessions.length === 0 || pets.length === 0) {
    logger.info('Skipping swipe actions seeder - no sessions or pets found');
    return;
  }

  const swipeActions = [];
  const actions = ['like', 'pass', 'super_like', 'info'];
  const actionWeights = [0.3, 0.5, 0.05, 0.15]; // Like: 30%, Pass: 50%, Super Like: 5%, Info: 15%

  // Create swipe actions for each session
  for (const sessionRow of sessions as SessionRow[]) {
    const numberOfSwipes = Math.floor(Math.random() * 20) + 5; // 5-25 swipes per session
    const sessionPets = [...(pets as PetRow[])]
      .sort(() => Math.random() - 0.5)
      .slice(0, numberOfSwipes);

    for (let i = 0; i < numberOfSwipes; i++) {
      const pet = sessionPets[i];
      if (!pet) {
        continue;
      }

      // Weighted random action selection
      const random = Math.random();
      let action = 'pass';
      let weightSum = 0;

      for (let j = 0; j < actions.length; j++) {
        weightSum += actionWeights[j];
        if (random <= weightSum) {
          action = actions[j];
          break;
        }
      }

      const baseTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const swipeTime = new Date(baseTime.getTime() + i * Math.random() * 60 * 1000); // Spread over time

      swipeActions.push({
        swipe_action_id: `swipe_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        pet_id: pet.pet_id,
        session_id: sessionRow.session_id,
        user_id: null, // Anonymous sessions for now
        timestamp: swipeTime,
        metadata: JSON.stringify({
          viewDuration: Math.floor(Math.random() * 10000) + 1000, // 1-11 seconds
          imageIndex: action === 'info' ? Math.floor(Math.random() * 3) : 0,
          source: 'discovery_page',
        }),
        created_at: swipeTime,
        updated_at: swipeTime,
      });
    }
  }

  await queryInterface.bulkInsert('swipe_actions', swipeActions);
  logger.info(`Seeded ${swipeActions.length} swipe actions`);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.bulkDelete('swipe_actions', {}, {});
};
