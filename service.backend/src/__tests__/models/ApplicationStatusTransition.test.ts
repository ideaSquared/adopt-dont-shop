import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Application, { ApplicationStatus } from '../../models/Application';
import ApplicationStatusTransition from '../../models/ApplicationStatusTransition';
import Rescue from '../../models/Rescue';
import User from '../../models/User';

/**
 * The transition log is the source of truth for application status.
 * applications.status is a denormalised cache maintained by:
 *   - a Postgres AFTER INSERT trigger in production / dev,
 *   - a Sequelize afterCreate hook on ApplicationStatusTransition in tests
 *     (SQLite, where triggers aren't installed).
 *
 * These tests exercise the SQLite path. The Postgres path is verified
 * manually in the dev stack — same end-state.
 */
describe('ApplicationStatusTransition', () => {
  let userId: string;
  let rescueId: string;
  let petId: string;

  const seedFixtures = async () => {
    await sequelize.sync({ force: true });

    const user = await User.create({
      userId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1',
      email: 'tester@audit.local',
      password: 'long-enough-password-123',
      firstName: 'A',
      lastName: 'B',
      userType: 'adopter',
      status: 'active',
      emailVerified: true,
    } as never);
    userId = user.userId;

    const rescue = await Rescue.create({
      name: 'Test Rescue',
      email: 'r@test.local',
      address: '1 Lane',
      city: 'Town',
      postcode: 'AB1 2CD',
      country: 'GB',
      contactPerson: 'X',
      status: 'pending',
      isDeleted: false,
    } as never);
    rescueId = rescue.rescueId;
    // Insert Pet via raw SQL to avoid the array-column SQLite vs Postgres
    // type mess (Pet.images / .videos / .tags are ARRAY in Postgres but
    // STRING in tests; passing real arrays through the model fails
    // validation under SQLite).
    petId = '11111111-1111-4111-a111-111111111111';
    await sequelize.getQueryInterface().bulkInsert('pets', [
      {
        pet_id: petId,
        name: 'TestPet',
        rescue_id: rescueId,
        type: 'dog',
        status: 'available',
        gender: 'male',
        age_group: 'adult',
        adoption_fee: 0,
        archived: false,
        featured: false,
        priority_listing: false,
        special_needs: false,
        house_trained: false,
        view_count: 0,
        favorite_count: 0,
        application_count: 0,
        images: '[]',
        videos: '[]',
        tags: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        version: 0,
      },
    ]);
  };

  beforeEach(async () => {
    await seedFixtures();
  });

  // Use queryInterface directly so we don't trip Application's
  // array-validating columns (tags, documents) under SQLite — same
  // workaround used elsewhere in the test suite.
  const newApplication = async (status = ApplicationStatus.SUBMITTED) => {
    const applicationId = `${Date.now().toString(16)}-1111-4111-a111-${Math.random()
      .toString(16)
      .slice(2, 14)
      .padEnd(12, '0')}`;
    await sequelize.getQueryInterface().bulkInsert('applications', [
      {
        application_id: applicationId,
        user_id: userId,
        pet_id: petId,
        rescue_id: rescueId,
        status,
        priority: 'normal',
        stage: 'questionnaire',
        answers: '{}',
        documents: '[]',
        tags: '[]',
        references: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        version: 0,
      },
    ]);
    const app = await Application.findByPk(applicationId);
    if (!app) {
      throw new Error('failed to seed application');
    }
    return app;
  };

  it('inserting a transition updates applications.status', async () => {
    const app = await newApplication();
    expect(app.status).toBe(ApplicationStatus.SUBMITTED);

    await ApplicationStatusTransition.create({
      applicationId: app.applicationId,
      fromStatus: ApplicationStatus.SUBMITTED,
      toStatus: ApplicationStatus.APPROVED,
      transitionedBy: userId,
      reason: 'Looks good',
    });

    const reloaded = await Application.findByPk(app.applicationId);
    expect(reloaded?.status).toBe(ApplicationStatus.APPROVED);
  });

  it('chains multiple transitions and preserves history in order', async () => {
    const app = await newApplication();

    await ApplicationStatusTransition.create({
      applicationId: app.applicationId,
      fromStatus: null,
      toStatus: ApplicationStatus.SUBMITTED,
      transitionedBy: userId,
    });
    await ApplicationStatusTransition.create({
      applicationId: app.applicationId,
      fromStatus: ApplicationStatus.SUBMITTED,
      toStatus: ApplicationStatus.APPROVED,
      transitionedBy: userId,
    });
    // Hypothetical reversal — application code wouldn't normally do this,
    // but the table is append-only so the history captures it cleanly.
    await ApplicationStatusTransition.create({
      applicationId: app.applicationId,
      fromStatus: ApplicationStatus.APPROVED,
      toStatus: ApplicationStatus.WITHDRAWN,
      transitionedBy: userId,
      reason: 'Adopter changed mind',
    });

    const history = await ApplicationStatusTransition.findAll({
      where: { applicationId: app.applicationId },
      order: [['transitionedAt', 'ASC']],
    });
    expect(history.map(t => t.toStatus)).toEqual([
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.WITHDRAWN,
    ]);

    const reloaded = await Application.findByPk(app.applicationId);
    expect(reloaded?.status).toBe(ApplicationStatus.WITHDRAWN);
  });

  it('records the actor and reason for forensic queries later', async () => {
    const app = await newApplication();

    await ApplicationStatusTransition.create({
      applicationId: app.applicationId,
      fromStatus: ApplicationStatus.SUBMITTED,
      toStatus: ApplicationStatus.REJECTED,
      transitionedBy: userId,
      reason: 'Insufficient references',
      metadata: { rejected_at_review_step: 'reference_check' },
    });

    const t = await ApplicationStatusTransition.findOne({
      where: { applicationId: app.applicationId, toStatus: ApplicationStatus.REJECTED },
    });
    expect(t?.transitionedBy).toBe(userId);
    expect(t?.reason).toBe('Insufficient references');
    expect(t?.metadata).toMatchObject({ rejected_at_review_step: 'reference_check' });
  });

  it('CASCADE deletes transitions when the application is hard-deleted', async () => {
    const app = await newApplication();
    await ApplicationStatusTransition.create({
      applicationId: app.applicationId,
      fromStatus: ApplicationStatus.SUBMITTED,
      toStatus: ApplicationStatus.APPROVED,
      transitionedBy: userId,
    });

    // Bypass paranoid soft-delete to verify the FK cascade.
    await app.destroy({ force: true });

    const remaining = await ApplicationStatusTransition.count({
      where: { applicationId: app.applicationId },
    });
    expect(remaining).toBe(0);
  });
});
