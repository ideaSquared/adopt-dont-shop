import { QueryInterface, DataTypes } from 'sequelize';

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
 */

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('applications', 'requires_coppa_consent', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('applications', 'parental_consent_given_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('applications', 'references_consented', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('applications', 'references_consented');
    await queryInterface.removeColumn('applications', 'parental_consent_given_at');
    await queryInterface.removeColumn('applications', 'requires_coppa_consent');
  },
};
