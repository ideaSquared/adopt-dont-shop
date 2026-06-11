import { describe, expect, it } from 'vitest';
import {
  buildBulkUpdatePayload,
  canApplyBulkAction,
  countByStage,
} from './applicationStageTransitions';
import type { ApplicationListItem } from '../types/applications';
import type { ApplicationStage } from '../types/applicationStages';

/**
 * ADS-642: per-stage rules for the rescue queue's bulk action bar.
 * These tests document the contract the queue and the BulkActionBar
 * rely on — change them and you change which rows the queue claims
 * are eligible for each action.
 */

const buildApp = (overrides: Partial<ApplicationListItem>): ApplicationListItem =>
  ({
    id: 'app-1',
    petId: 'pet-1',
    petName: 'Bella',
    petType: 'Dog',
    petBreed: 'Mix',
    userId: 'user-1',
    rescueId: 'rescue-1',
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: undefined,
    applicantName: 'Test Person',
    submittedDaysAgo: 1,
    priority: 'normal',
    referencesStatus: 'pending',
    homeVisitStatus: 'not_scheduled',
    stage: 'PENDING',
    stageProgressPercentage: 10,
    tags: [],
    ...overrides,
  }) as ApplicationListItem;

describe('canApplyBulkAction (ADS-642)', () => {
  describe('advance (move to next stage)', () => {
    it.each<ApplicationStage>(['PENDING', 'REVIEWING', 'VISITING'])(
      'is eligible for an application in the %s stage',
      stage => {
        expect(canApplyBulkAction('advance', buildApp({ stage })).eligible).toBe(true);
      }
    );

    it('blocks an application already in DECIDING with a clear message about resolving instead', () => {
      const result = canApplyBulkAction('advance', buildApp({ stage: 'DECIDING' }));
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('no-next-stage');
        expect(result.message.toLowerCase()).toContain('approve');
      }
    });

    it('blocks an application already in RESOLVED', () => {
      const result = canApplyBulkAction('advance', buildApp({ stage: 'RESOLVED' }));
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('already-resolved');
      }
    });
  });

  describe('approve', () => {
    it('only allows approval when the application is in the DECIDING stage', () => {
      const earlyStage = canApplyBulkAction(
        'approve',
        buildApp({ stage: 'REVIEWING', homeVisitStatus: 'completed' })
      );
      expect(earlyStage.eligible).toBe(false);
      if (!earlyStage.eligible) {
        expect(earlyStage.reason).toBe('not-in-deciding-stage');
      }
    });

    it('refuses approval when the home visit is not completed', () => {
      const result = canApplyBulkAction(
        'approve',
        buildApp({ stage: 'DECIDING', homeVisitStatus: 'scheduled' })
      );
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('home-visit-not-completed');
      }
    });

    it('allows approval for a DECIDING application with a completed home visit', () => {
      expect(
        canApplyBulkAction('approve', buildApp({ stage: 'DECIDING', homeVisitStatus: 'completed' }))
          .eligible
      ).toBe(true);
    });
  });

  describe('reject and withdraw', () => {
    it.each<ApplicationStage>(['PENDING', 'REVIEWING', 'VISITING', 'DECIDING'])(
      'allow rejection for any non-terminal stage (%s)',
      stage => {
        expect(canApplyBulkAction('reject', buildApp({ stage })).eligible).toBe(true);
      }
    );

    it('blocks reject on a resolved application', () => {
      expect(canApplyBulkAction('reject', buildApp({ stage: 'RESOLVED' })).eligible).toBe(false);
    });

    it.each<ApplicationStage>(['PENDING', 'REVIEWING', 'VISITING', 'DECIDING'])(
      'allow withdrawal for any non-terminal stage (%s)',
      stage => {
        expect(canApplyBulkAction('withdraw', buildApp({ stage })).eligible).toBe(true);
      }
    );

    it('blocks withdraw on a resolved application', () => {
      expect(canApplyBulkAction('withdraw', buildApp({ stage: 'RESOLVED' })).eligible).toBe(false);
    });
  });
});

describe('buildBulkUpdatePayload (ADS-642)', () => {
  it('advances PENDING to REVIEWING by setting the stage column', () => {
    expect(buildBulkUpdatePayload('advance', buildApp({ stage: 'PENDING' }))).toEqual({
      stage: 'reviewing',
    });
  });

  it('advances VISITING to DECIDING', () => {
    expect(buildBulkUpdatePayload('advance', buildApp({ stage: 'VISITING' }))).toEqual({
      stage: 'deciding',
    });
  });

  it('builds the approve payload with terminal status and final outcome', () => {
    expect(
      buildBulkUpdatePayload(
        'approve',
        buildApp({ stage: 'DECIDING', homeVisitStatus: 'completed' })
      )
    ).toEqual({ status: 'approved', stage: 'resolved', finalOutcome: 'approved' });
  });

  it('embeds the shared rejection reason in the reject payload', () => {
    expect(
      buildBulkUpdatePayload('reject', buildApp({ stage: 'REVIEWING' }), 'duplicate application')
    ).toEqual({
      status: 'rejected',
      stage: 'resolved',
      finalOutcome: 'rejected',
      rejectionReason: 'duplicate application',
    });
  });

  it('embeds the withdrawal reason in the withdraw payload', () => {
    expect(
      buildBulkUpdatePayload('withdraw', buildApp({ stage: 'PENDING' }), 'applicant changed mind')
    ).toEqual({
      status: 'withdrawn',
      stage: 'withdrawn',
      finalOutcome: 'withdrawn',
      withdrawalReason: 'applicant changed mind',
    });
  });
});

describe('countByStage (ADS-642)', () => {
  it('returns zero for every stage when given an empty list', () => {
    expect(countByStage([])).toEqual({
      PENDING: 0,
      REVIEWING: 0,
      VISITING: 0,
      DECIDING: 0,
      RESOLVED: 0,
    });
  });

  it('aggregates a mixed list correctly', () => {
    const apps = [
      { stage: 'PENDING' as const },
      { stage: 'PENDING' as const },
      { stage: 'REVIEWING' as const },
      { stage: 'VISITING' as const },
      { stage: 'DECIDING' as const },
      { stage: 'RESOLVED' as const },
      { stage: 'RESOLVED' as const },
      { stage: 'RESOLVED' as const },
    ];
    expect(countByStage(apps)).toEqual({
      PENDING: 2,
      REVIEWING: 1,
      VISITING: 1,
      DECIDING: 1,
      RESOLVED: 3,
    });
  });
});
