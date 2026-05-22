import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Application, { ApplicationStatus } from '../../models/Application';
import Rescue from '../../models/Rescue';
import User from '../../models/User';

/**
 * Model-layer guard for the application status state machine.
 *
 * The service layer (ApplicationService.updateApplicationStatus) already
 * calls canTransitionTo() before mutating status, but a future endpoint
 * could bypass that path by calling instance.update({ status }) directly.
 * The beforeUpdate hook on Application is the backstop that prevents
 * illegal jumps (e.g. SUBMITTED -> APPROVED with no review, or
 * APPROVED -> SUBMITTED reopening a final decision).
 */
describe('Application status transition (model-layer invariant)', () => {
  let userId: string;
  let rescueId: string;
  let petId: string;

  const seedFixtures = async () => {
    await sequelize.sync({ force: true });

    const user = await User.create({
      userId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1',
      email: 'tester@status.local',
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
      email: 'r@status.local',
      address: '1 Lane',
      city: 'Town',
      postcode: 'AB1 2CD',
      country: 'GB',
      contactPerson: 'X',
      status: 'pending',
    } as never);
    rescueId = rescue.rescueId;

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
        adoption_fee_minor: 0,
        adoption_fee_currency: 'GBP',
        archived: false,
        featured: false,
        priority_listing: false,
        special_needs: false,
        house_trained: false,
        view_count: 0,
        favorite_count: 0,
        application_count: 0,
        tags: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        version: 0,
      },
    ]);
  };

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
        documents: '[]',
        tags: '[]',
        references_consented: true,
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

  beforeEach(async () => {
    await seedFixtures();
  });

  it('allows a valid transition (SUBMITTED -> APPROVED) via instance.update', async () => {
    const app = await newApplication(ApplicationStatus.SUBMITTED);
    await app.update({ status: ApplicationStatus.APPROVED });
    expect(app.status).toBe(ApplicationStatus.APPROVED);
  });

  it('allows a valid transition (SUBMITTED -> WITHDRAWN) via instance.update', async () => {
    const app = await newApplication(ApplicationStatus.SUBMITTED);
    await app.update({ status: ApplicationStatus.WITHDRAWN });
    expect(app.status).toBe(ApplicationStatus.WITHDRAWN);
  });

  it('rejects re-opening an APPROVED application (APPROVED -> SUBMITTED)', async () => {
    const app = await newApplication(ApplicationStatus.APPROVED);
    await expect(app.update({ status: ApplicationStatus.SUBMITTED })).rejects.toThrow(
      /Invalid application status transition/
    );
  });

  it('rejects a final-state-to-final-state jump (APPROVED -> REJECTED)', async () => {
    const app = await newApplication(ApplicationStatus.APPROVED);
    await expect(app.update({ status: ApplicationStatus.REJECTED })).rejects.toThrow(
      /Invalid application status transition/
    );
  });

  it('rejects re-opening a REJECTED application (REJECTED -> APPROVED)', async () => {
    const app = await newApplication(ApplicationStatus.REJECTED);
    await expect(app.update({ status: ApplicationStatus.APPROVED })).rejects.toThrow(
      /Invalid application status transition/
    );
  });

  it('allows updates that do not change status', async () => {
    const app = await newApplication(ApplicationStatus.APPROVED);
    await app.update({ notes: 'some notes' });
    expect(app.status).toBe(ApplicationStatus.APPROVED);
    expect(app.notes).toBe('some notes');
  });

  it('rejects forbidden transitions via bulk Application.update with individualHooks', async () => {
    // The two bulk-update callsites in application.service.ts (home-visit
    // scheduling and outcome propagation) must run with individualHooks:true
    // so the beforeUpdate state-machine guard fires per row. Without that
    // flag, a forbidden REJECTED -> APPROVED transition silently commits.
    const app = await newApplication(ApplicationStatus.REJECTED);
    await expect(
      Application.update(
        { status: ApplicationStatus.APPROVED },
        { where: { applicationId: app.applicationId }, individualHooks: true }
      )
    ).rejects.toThrow(/Invalid application status transition/);
  });
});
