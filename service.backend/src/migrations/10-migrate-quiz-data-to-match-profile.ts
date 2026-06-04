/**
 * Depends on `09-add-allergies-to-adopter-match-profile.ts` (the `allergies`
 * column must exist before this migration writes to it). umzug runs
 * migrations in alphabetical-filename order, so the dependency is
 * satisfied by the `09 < 10` prefix — see scripts/check-migration-prefixes.mjs
 * for the CI guard that prevents future collisions inside prefix 09. (ADS-702)
 *
 * ADS-635: Migrate existing quiz blob data into adopter_match_profile.
 *
 * Users who completed the old onboarding quiz have answers stored in
 * user_preferences.preferences -> 'quiz'. This migration reads those
 * blobs and upserts them into adopter_match_profile, mapping:
 *
 *   quiz.homeType       → lifestyle.housing_type
 *   quiz.kids           → lifestyle.has_children
 *   quiz.otherPets      → lifestyle.has_other_pets
 *   quiz.activityLevel  → preferred_energy
 *   quiz.sizePreference → preferred_sizes
 *   quiz.allergies      → allergies
 *
 * Match profile data wins on conflicts (it's more detailed).
 */
import { type QueryInterface } from 'sequelize';

import { columnExists, runInTransaction } from './_helpers';

type QuizBlob = {
  homeType?: string;
  kids?: string;
  otherPets?: string;
  activityLevel?: string;
  allergies?: string;
  sizePreference?: string;
};

const mapHousingType = (v: string): string => {
  if (v === 'apartment') return 'apartment';
  if (v === 'house_no_yard' || v === 'house_with_yard') return 'house';
  return 'other';
};

const mapSizePreference = (v: string): string[] => {
  if (v === 'any') return [];
  return [v];
};

const mapActivityToEnergy = (v: string): string[] => {
  // Quiz had low/medium/high; match profile uses the same values
  return [v];
};

export default {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;

    // ADS-784: this backfill targets the legacy `user_preferences.preferences`
    // JSONB blob. That column was removed when user_preferences became a
    // normalised key/value table, so on a clean DB the column never exists and
    // there is nothing to migrate. Skip rather than fail on the missing column
    // (this migration never ran from clean — the old logger crash masked it).
    if (!(await columnExists(queryInterface, 'user_preferences', 'preferences'))) {
      return;
    }

    await runInTransaction(queryInterface, async transaction => {
      // Find users with quiz data in their preferences blob.
      const [rows] = (await sequelize.query(
        `
        SELECT u.user_id, up.preferences
        FROM users u
        JOIN user_preferences up ON up.user_id = u.user_id
        WHERE up.preferences::text LIKE '%"quiz"%'
      `,
        { transaction }
      )) as [Array<{ user_id: string; preferences: Record<string, unknown> }>, unknown];

      for (const row of rows) {
        const prefs =
          typeof row.preferences === 'string'
            ? (JSON.parse(row.preferences) as Record<string, unknown>)
            : row.preferences;
        const quiz = prefs.quiz as QuizBlob | undefined;
        if (!quiz) continue;

        // Check if match profile already exists
        const [existing] = (await sequelize.query(
          `
          SELECT user_id, lifestyle, preferred_energy, preferred_sizes, allergies
          FROM adopter_match_profile
          WHERE user_id = :userId
        `,
          {
            replacements: { userId: row.user_id },
            transaction,
          }
        )) as [
          Array<{
            user_id: string;
            lifestyle: Record<string, unknown>;
            preferred_energy: string[] | null;
            preferred_sizes: string[] | null;
            allergies: string | null;
          }>,
          unknown,
        ];

        const profile = existing[0];

        if (profile) {
          // Match profile exists — only fill in blanks (match profile data wins)
          const lifestyle = (
            typeof profile.lifestyle === 'string'
              ? JSON.parse(profile.lifestyle)
              : (profile.lifestyle ?? {})
          ) as Record<string, unknown>;

          const updates: string[] = [];
          const replacements: Record<string, unknown> = { userId: row.user_id };

          if (!lifestyle.housing_type && quiz.homeType) {
            lifestyle.housing_type = mapHousingType(quiz.homeType);
          }
          if (lifestyle.has_children === undefined && quiz.kids) {
            lifestyle.has_children = quiz.kids !== 'none';
          }
          if (lifestyle.has_other_pets === undefined && quiz.otherPets) {
            lifestyle.has_other_pets = quiz.otherPets !== 'none';
          }
          if (quiz.homeType === 'house_with_yard' && lifestyle.yard === undefined) {
            lifestyle.yard = true;
          }

          updates.push('lifestyle = :lifestyle');
          replacements.lifestyle = JSON.stringify(lifestyle);

          if (!profile.preferred_energy?.length && quiz.activityLevel) {
            updates.push('preferred_energy = :energy');
            replacements.energy = JSON.stringify(mapActivityToEnergy(quiz.activityLevel));
          }
          if (
            !profile.preferred_sizes?.length &&
            quiz.sizePreference &&
            quiz.sizePreference !== 'any'
          ) {
            updates.push('preferred_sizes = :sizes');
            replacements.sizes = JSON.stringify(mapSizePreference(quiz.sizePreference));
          }
          if (!profile.allergies && quiz.allergies && quiz.allergies !== 'none') {
            updates.push('allergies = :allergies');
            replacements.allergies = quiz.allergies;
          }

          if (updates.length > 0) {
            await sequelize.query(
              `UPDATE adopter_match_profile SET ${updates.join(', ')} WHERE user_id = :userId`,
              { replacements, transaction }
            );
          }
        } else {
          // No match profile — create one from quiz data. ON CONFLICT keeps
          // this idempotent if a concurrent writer (or a retry of a partially
          // applied migration) has inserted the row since the SELECT above.
          const lifestyle: Record<string, unknown> = {};
          if (quiz.homeType) lifestyle.housing_type = mapHousingType(quiz.homeType);
          if (quiz.kids) lifestyle.has_children = quiz.kids !== 'none';
          if (quiz.otherPets) lifestyle.has_other_pets = quiz.otherPets !== 'none';
          if (quiz.homeType === 'house_with_yard') lifestyle.yard = true;

          await sequelize.query(
            `
            INSERT INTO adopter_match_profile (
              user_id, lifestyle, preferred_energy, preferred_sizes, allergies,
              inferred_prefs, open_to_special_needs, notify_new_matches,
              min_notification_score, created_at, updated_at
            ) VALUES (
              :userId, :lifestyle, :energy, :sizes, :allergies,
              '{}', false, false, 75, NOW(), NOW()
            )
            ON CONFLICT (user_id) DO NOTHING
          `,
            {
              replacements: {
                userId: row.user_id,
                lifestyle: JSON.stringify(lifestyle),
                energy: quiz.activityLevel
                  ? JSON.stringify(mapActivityToEnergy(quiz.activityLevel))
                  : null,
                sizes:
                  quiz.sizePreference && quiz.sizePreference !== 'any'
                    ? JSON.stringify(mapSizePreference(quiz.sizePreference))
                    : null,
                allergies: quiz.allergies && quiz.allergies !== 'none' ? quiz.allergies : null,
              },
              transaction,
            }
          );
        }
      }
    });
  },

  down: async (): Promise<void> => {
    // Intentional no-op: this is a non-destructive data backfill. The source
    // quiz data still lives in user_preferences.preferences -> 'quiz' and the
    // up() used ON CONFLICT DO NOTHING, so existing adopter_match_profile rows
    // were not modified. Leaving the backfilled rows in place on rollback is
    // safe. If a future change makes the down() destructive, reinstate the
    // assertDestructiveDownAcknowledged guard from _helpers.
  },
};
