import sequelize from '../sequelize';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';

interface SessionLengthResult {
  avg_session_length: number;
}

export interface SwipeAction {
  action: 'like' | 'pass' | 'super_like' | 'info';
  petId: string;
  sessionId: string;
  timestamp: string;
  userId?: string;
}

export interface SwipeStats {
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  infoViews: number;
  likeRate: number;
  averageSessionLength: number;
  topBreeds: Array<{ breed: string; count: number }>;
  topTypes: Array<{ type: string; count: number }>;
}

export interface SessionStats {
  sessionId: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  infoViews: number;
  startTime: string;
  lastActivity: string;
  duration: number; // in minutes
}

interface UserPreference {
  preference_type: string;
  preference_value: string;
  score: number;
}

type PreferencesByType = Record<string, Array<{ value: string; score: number }>>;

export class SwipeService {
  private skipTableCreation: boolean = false;

  constructor(skipTableCreation = false) {
    this.skipTableCreation = skipTableCreation;
  }

  /**
   * Record a swipe action
   */
  async recordSwipeAction(swipeAction: SwipeAction): Promise<void> {
    try {
      logger.info('Recording swipe action', {
        action: swipeAction.action,
        petId: swipeAction.petId,
        sessionId: swipeAction.sessionId,
      });

      // Ensure swipe_actions table exists (skip in tests)
      if (!this.skipTableCreation) {
        await this.ensureSwipeActionsTable();
      }

      // Insert swipe action into database
      await sequelize.query(
        `
        INSERT INTO swipe_actions (
          action,
          pet_id,
          session_id,
          user_id,
          timestamp,
          created_at,
          updated_at
        ) VALUES (
          :action,
          :petId,
          :sessionId,
          :userId,
          :timestamp,
          NOW(),
          NOW()
        )
      `,
        {
          replacements: {
            action: swipeAction.action,
            petId: swipeAction.petId,
            sessionId: swipeAction.sessionId,
            userId: swipeAction.userId || null,
            timestamp: swipeAction.timestamp,
          },
        }
      );

      // Update user preferences based on the action (for ML learning)
      if (
        swipeAction.userId &&
        (swipeAction.action === 'like' || swipeAction.action === 'super_like')
      ) {
        await this.updateUserPreferences(swipeAction.userId, swipeAction.petId, swipeAction.action);
      }
    } catch (error) {
      logger.error('Error recording swipe action', { error, swipeAction });
      throw new Error('Failed to record swipe action');
    }
  }

  /**
   * Ensure the swipe_actions table exists
   */
  private async ensureSwipeActionsTable(): Promise<void> {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS swipe_actions (
          id SERIAL PRIMARY KEY,
          action VARCHAR(20) NOT NULL CHECK (action IN ('like', 'pass', 'super_like', 'info')),
          pet_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255),
          timestamp TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes separately (PostgreSQL syntax)
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_swipe_pet_id ON swipe_actions (pet_id)
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_swipe_session_id ON swipe_actions (session_id)
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_swipe_user_id ON swipe_actions (user_id)
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_swipe_timestamp ON swipe_actions (timestamp)
      `);
    } catch (error) {
      logger.warn('Could not create swipe_actions table, it may already exist', { error });
    }
  }

  /**
   * Get user's swipe statistics
   */
  async getUserSwipeStats(userId: string): Promise<SwipeStats> {
    try {
      logger.info('Getting user swipe stats', { userId });

      // Get basic swipe counts
      const [swipeResults] = await sequelize.query(
        `
        SELECT
          COUNT(*) as total_swipes,
          COUNT(CASE WHEN action = 'like' THEN 1 END) as likes,
          COUNT(CASE WHEN action = 'pass' THEN 1 END) as passes,
          COUNT(CASE WHEN action = 'super_like' THEN 1 END) as super_likes,
          COUNT(CASE WHEN action = 'info' THEN 1 END) as info_views
        FROM swipe_actions
        WHERE user_id = :userId
      `,
        {
          replacements: { userId },
        }
      );

      interface SwipeStatsRow {
        total_swipes: string;
        likes: string;
        passes: string;
        super_likes: string;
        info_views: string;
      }

      const stats = (swipeResults as SwipeStatsRow[])[0];

      // Get top breeds liked by user
      const [breedResults] = await sequelize.query(
        `
        SELECT p.breed, COUNT(*) as count
        FROM swipe_actions sa
        JOIN pets p ON sa.pet_id = p.pet_id
        WHERE sa.user_id = :userId
          AND sa.action IN ('like', 'super_like')
          AND p.breed IS NOT NULL
        GROUP BY p.breed
        ORDER BY count DESC
        LIMIT 5
      `,
        {
          replacements: { userId },
        }
      );

      // Get top pet types liked by user
      const [typeResults] = await sequelize.query(
        `
        SELECT p.type, COUNT(*) as count
        FROM swipe_actions sa
        JOIN pets p ON sa.pet_id = p.pet_id
        WHERE sa.user_id = :userId
          AND sa.action IN ('like', 'super_like')
        GROUP BY p.type
        ORDER BY count DESC
        LIMIT 3
      `,
        {
          replacements: { userId },
        }
      );

      // Calculate average session length
      const [sessionResults] = await sequelize.query(
        `
        SELECT AVG(session_duration) as avg_session_length
        FROM (
          SELECT
            session_id,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60 as session_duration
          FROM swipe_actions
          WHERE user_id = :userId
          GROUP BY session_id
          HAVING COUNT(*) > 1
        ) session_stats
      `,
        {
          replacements: { userId },
        }
      );

      const totalSwipes = parseInt(stats.total_swipes) || 0;
      const likes = parseInt(stats.likes) || 0;
      const likeRate = totalSwipes > 0 ? (likes / totalSwipes) * 100 : 0;
      const avgSessionLength = (sessionResults[0] as SessionLengthResult)?.avg_session_length || 0;

      return {
        totalSwipes,
        likes,
        passes: parseInt(stats.passes) || 0,
        superLikes: parseInt(stats.super_likes) || 0,
        infoViews: parseInt(stats.info_views) || 0,
        likeRate: Math.round(likeRate * 100) / 100,
        averageSessionLength: Math.round(avgSessionLength * 100) / 100,
        topBreeds: breedResults as Array<{ breed: string; count: number }>,
        topTypes: typeResults as Array<{ type: string; count: number }>,
      };
    } catch (error) {
      logger.error('Error getting user swipe stats', { error, userId });
      throw new Error('Failed to get user swipe statistics');
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    try {
      logger.info('Getting session stats', { sessionId });

      const [results] = await sequelize.query(
        `
        SELECT
          session_id,
          COUNT(*) as total_swipes,
          COUNT(CASE WHEN action = 'like' THEN 1 END) as likes,
          COUNT(CASE WHEN action = 'pass' THEN 1 END) as passes,
          COUNT(CASE WHEN action = 'super_like' THEN 1 END) as super_likes,
          COUNT(CASE WHEN action = 'info' THEN 1 END) as info_views,
          MIN(timestamp) as start_time,
          MAX(timestamp) as last_activity,
          EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60 as duration
        FROM swipe_actions
        WHERE session_id = :sessionId
        GROUP BY session_id
      `,
        {
          replacements: { sessionId },
        }
      );

      if (!results.length) {
        throw new Error('Session not found');
      }

      interface SessionStatsRow {
        session_id: string;
        total_swipes: string;
        likes: string;
        passes: string;
        super_likes: string;
        info_views: string;
        start_time: Date;
        last_activity: Date;
        duration: number;
      }

      const stats = (results as SessionStatsRow[])[0];

      return {
        sessionId,
        totalSwipes: parseInt(stats.total_swipes) || 0,
        likes: parseInt(stats.likes) || 0,
        passes: parseInt(stats.passes) || 0,
        superLikes: parseInt(stats.super_likes) || 0,
        infoViews: parseInt(stats.info_views) || 0,
        startTime: stats.start_time.toISOString(),
        lastActivity: stats.last_activity.toISOString(),
        duration: Math.round((stats.duration || 0) * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting session stats', { error, sessionId });
      throw new Error('Failed to get session statistics');
    }
  }

  /**
   * Update user preferences based on swipe actions (for ML learning)
   */
  private async updateUserPreferences(
    userId: string,
    petId: string,
    action: 'like' | 'super_like'
  ): Promise<void> {
    try {
      // Get pet details for preference learning
      const [petResults] = await sequelize.query(
        `
        SELECT type, breed, age_group, size, gender, good_with_children,
               good_with_dogs, good_with_cats, energy_level
        FROM pets
        WHERE pet_id = :petId
      `,
        {
          replacements: { petId },
        }
      );

      if (!petResults.length) {
        return;
      }

      interface PetPreferenceData {
        type: string;
        breed: string;
        age_group: string;
        size: string;
        gender: string;
        good_with_children: boolean;
        good_with_dogs: boolean;
        good_with_cats: boolean;
        energy_level: string;
      }

      const pet = (petResults as PetPreferenceData[])[0];
      const weight = action === 'super_like' ? 2 : 1; // Super likes count more

      // Update or insert user preference scores
      await sequelize.query(
        `
        INSERT INTO user_preferences (
          user_id, preference_type, preference_value, score, updated_at
        ) VALUES
          (:userId, 'type', :type, :weight, NOW()),
          (:userId, 'breed', :breed, :weight, NOW()),
          (:userId, 'age_group', :ageGroup, :weight, NOW()),
          (:userId, 'size', :size, :weight, NOW()),
          (:userId, 'gender', :gender, :weight, NOW())
        ON CONFLICT (user_id, preference_type, preference_value)
        DO UPDATE SET
          score = user_preferences.score + :weight,
          updated_at = NOW()
      `,
        {
          replacements: {
            userId,
            type: pet.type,
            breed: pet.breed || 'unknown',
            ageGroup: pet.age_group,
            size: pet.size,
            gender: pet.gender,
            weight,
          },
        }
      );

      logger.info('Updated user preferences', { userId, petId, action, weight });
    } catch (error) {
      logger.error('Error updating user preferences', { error, userId, petId, action });
      // Don't throw error as this is not critical for the swipe action
    }
  }

  /**
   * Get user preferences for discovery algorithm
   */
  async getUserPreferences(userId: string): Promise<PreferencesByType> {
    try {
      const [results] = await sequelize.query(
        `
        SELECT preference_type, preference_value, score
        FROM user_preferences
        WHERE user_id = :userId
        ORDER BY score DESC
      `,
        {
          replacements: { userId },
        }
      );

      // Group preferences by type
      const preferences: PreferencesByType = {};
      for (const pref of results as UserPreference[]) {
        if (!preferences[pref.preference_type]) {
          preferences[pref.preference_type] = [];
        }
        preferences[pref.preference_type].push({
          value: pref.preference_value,
          score: pref.score,
        });
      }

      return preferences;
    } catch (error) {
      logger.error('Error getting user preferences', { error, userId });
      return {};
    }
  }
}
