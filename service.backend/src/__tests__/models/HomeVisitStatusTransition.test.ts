import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Application, { ApplicationStatus } from '../../models/Application';
import HomeVisit, { HomeVisitStatus } from '../../models/HomeVisit';
import HomeVisitStatusTransition from '../../models/HomeVisitStatusTransition';
import Rescue from '../../models/Rescue';
import User from '../../models/User';

describe('HomeVisitStatusTransition', () => {
  let userId: string;
  let rescueId: string;
  let petId: string;
  let applicationId: string;
  let visitId: string;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    const user = await User.create({
      userId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
      email: 'visit@audit.local',
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
      email: 'r2@test.local',
      address: '1 Lane',
      city: 'Town',
      postcode: 'AB1 2CD',
      country: 'GB',
      contactPerson: 'X',
      status: 'pending',
    } as never);
    rescueId = rescue.rescueId;

    petId = '33333333-3333-4333-a333-333333333333';
    await sequelize.getQueryInterface().bulkInsert('pets', [
      {
        pet_id: petId,
        name: 'Visitor',
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

    applicationId = '44444444-4444-4444-a444-444444444444';
    await sequelize.getQueryInterface().bulkInsert('applications', [
      {
        application_id: applicationId,
        user_id: userId,
        pet_id: petId,
        rescue_id: rescueId,
        status: ApplicationStatus.SUBMITTED,
        priority: 'normal',
        stage: 'questionnaire',
        answers: '{}',
        documents: '[]',
        tags: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        version: 0,
      },
    ]);

    visitId = '55555555-5555-4555-a555-555555555555';
    await HomeVisit.create({
      visit_id: visitId,
      application_id: applicationId,
      scheduled_date: '2026-05-10',
      scheduled_time: '14:00:00',
      assigned_staff: userId,
      status: HomeVisitStatus.SCHEDULED,
    } as never);
  });

  it('inserting a transition updates home_visits.status', async () => {
    await HomeVisitStatusTransition.create({
      visitId,
      fromStatus: HomeVisitStatus.SCHEDULED,
      toStatus: HomeVisitStatus.IN_PROGRESS,
      transitionedBy: userId,
    });

    const reloaded = await HomeVisit.findByPk(visitId);
    expect(reloaded?.status).toBe(HomeVisitStatus.IN_PROGRESS);
  });

  it('records cancellation reason in the transition log', async () => {
    await HomeVisitStatusTransition.create({
      visitId,
      fromStatus: HomeVisitStatus.SCHEDULED,
      toStatus: HomeVisitStatus.CANCELLED,
      transitionedBy: userId,
      reason: 'Adopter unavailable',
    });

    const t = await HomeVisitStatusTransition.findOne({
      where: { visitId, toStatus: HomeVisitStatus.CANCELLED },
    });
    expect(t?.reason).toBe('Adopter unavailable');

    const reloaded = await HomeVisit.findByPk(visitId);
    expect(reloaded?.status).toBe(HomeVisitStatus.CANCELLED);
  });
});
