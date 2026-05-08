import { describe, it, expect } from 'vitest';
import { RETENTION_POLICIES } from '../../services/data-retention.service';

describe('RETENTION_POLICIES', () => {
  it('declares a soft-delete grace window of 30 days', () => {
    expect(RETENTION_POLICIES.softDeletedUsersGraceDays).toBe(30);
  });

  it('declares the documented retention windows', () => {
    expect(RETENTION_POLICIES.notificationsDays).toBe(90);
    expect(RETENTION_POLICIES.emailQueueDays).toBe(365);
    expect(RETENTION_POLICIES.refreshTokensExpiredDays).toBe(30);
    expect(RETENTION_POLICIES.idempotencyKeysHours).toBe(24);
    expect(RETENTION_POLICIES.swipeActionsMonths).toBe(24);
  });

  it('all retention windows are positive', () => {
    for (const value of Object.values(RETENTION_POLICIES)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});
