import { QueryInterface, Op, QueryTypes } from 'sequelize';

/**
 * ADS-168: Prevent duplicate active applications for the same (user, pet) pair.
 *
 * Adds a partial unique index on applications(user_id, pet_id) scoped to
 * non-terminal statuses (i.e. excluding 'rejected' and 'withdrawn'). Users MUST
 * be allowed to apply again after a previous application is rejected or withdrawn,
 * so a plain unique index on (user_id, pet_id) would be too restrictive.
 *
 * The application service already has a pre-flight findOne guard, but that guard
 * has a TOCTOU race window (two concurrent requests both pass the check before
 * either commit). This index closes the race: the second INSERT will fail with a
 * UniqueConstraintError, which the service maps to a conflict error.
 *
 * Before creating the index, this migration detects any pre-existing duplicate
 * active rows and marks the older ones as 'withdrawn' so the index creation
 * does not fail on live data.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    // Detect and resolve pre-existing duplicate active applications before
    // adding the unique constraint. For each (user_id, pet_id) pair that has
    // more than one non-terminal application, keep the most recent one and mark
    // the older duplicates as 'withdrawn'.
    //
    // This query finds all application_id values that are NOT the newest active
    // row for their (user_id, pet_id) pair.
    type DuplicateRow = { application_id: string };

    const duplicates = (await queryInterface.sequelize.query(
      `
      SELECT a.application_id
      FROM applications a
      INNER JOIN (
        SELECT user_id, pet_id, MAX(created_at) AS newest_created_at
        FROM applications
        WHERE status NOT IN ('rejected', 'withdrawn')
          AND deleted_at IS NULL
        GROUP BY user_id, pet_id
        HAVING COUNT(*) > 1
      ) dupes
        ON a.user_id = dupes.user_id
       AND a.pet_id = dupes.pet_id
       AND a.created_at < dupes.newest_created_at
      WHERE a.status NOT IN ('rejected', 'withdrawn')
        AND a.deleted_at IS NULL
      `,
      { type: QueryTypes.SELECT }
    )) as DuplicateRow[];

    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map((row: DuplicateRow) => row.application_id);

      // eslint-disable-next-line no-console
      console.log(
        `[migration 09] Marking ${duplicateIds.length} duplicate active application(s) as withdrawn before adding unique index.`
      );

      await queryInterface.sequelize.query(
        `UPDATE applications
         SET status = 'withdrawn', updated_at = NOW()
         WHERE application_id IN (:ids)`,
        { replacements: { ids: duplicateIds } }
      );
    }

    // Partial unique index: only one active (non-rejected, non-withdrawn)
    // application is allowed per (user_id, pet_id) pair at a time.
    await queryInterface.addIndex('applications', ['user_id', 'pet_id'], {
      name: 'applications_active_user_pet_uniq',
      unique: true,
      where: {
        status: {
          [Op.notIn]: ['rejected', 'withdrawn'],
        },
      },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('applications', 'applications_active_user_pet_uniq');
  },
};
