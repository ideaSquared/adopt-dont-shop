import type { QueryInterface } from 'sequelize';

/**
 * ADS-534 / ADS-535: privacy / consent fields on adoption applications.
 *
 *   • requires_coppa_consent — set true at draft time when the
 *     household answers reference any child under 13. Submission is
 *     blocked unless `parental_consent_given_at` is also non-null.
 *   • parental_consent_given_at — timestamp the applicant ticked the
 *     parental-consent affirmation. Combined with `requires_coppa_consent`
 *     this gates COPPA-relevant submissions at the model layer.
 *   • references_consented — applicant attestation that the third-party
 *     reference contacts have been informed and have agreed to be
 *     contacted. Defaults false so existing draft rows aren't auto-marked
 *     consented; submission validator enforces true at SUBMITTED time.
 *
 * Defaults (false / null) keep historical rows readable; the model-level
 * validator only blocks new SUBMITTED transitions, so back-office editing
 * of legacy rows continues to work.
 *
 * Idempotency note (follow-up to #451 / #454): the `Application` model
 * declaration now includes these three columns, so `00-baseline-020-applications.ts`
 * (D4 PR #442) creates them via `createTable`'s column list. On a fresh DB
 * the baseline runs first and `addColumn` would collide. Patched to raw
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so it no-ops on fresh-DB-with-
 * baseline and still works on pre-rebaseline DBs that have the older
 * applications schema.
 *
 * `down()` is intentionally unchanged.
 */

export default {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(
      'ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "requires_coppa_consent" BOOLEAN NOT NULL DEFAULT FALSE'
    );
    await sequelize.query(
      'ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "parental_consent_given_at" TIMESTAMP WITH TIME ZONE'
    );
    await sequelize.query(
      'ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "references_consented" BOOLEAN NOT NULL DEFAULT FALSE'
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('applications', 'references_consented');
    await queryInterface.removeColumn('applications', 'parental_consent_given_at');
    await queryInterface.removeColumn('applications', 'requires_coppa_consent');
  },
};
