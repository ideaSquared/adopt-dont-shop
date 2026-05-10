/**
 * ADS-497 (slice 4): behaviour tests for the bulk legal-reminder cron.
 *
 * Covers the five operational outcomes the runbook calls out:
 *   - empty backlog
 *   - all eligible users get sent
 *   - all candidates already inside the rate-limit window
 *   - one user errors mid-batch (others still complete; error counted)
 *   - dry-run does not invoke sendReacceptanceReminder
 *   - batchSize cap honoured (over-supply of eligible users → cap)
 *
 * Service internals (audit log fingerprint dedupe, version rendering)
 * are covered in legal-reminder.test.ts; this file treats
 * `sendReacceptanceReminder` as a black box.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logExternalService: vi.fn(), logSecurity: vi.fn() },
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/AuditLog', () => ({
  default: {
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(undefined),
  },
  AuditLog: {
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(undefined),
  },
  withAuditMutationAllowed: vi.fn(),
}));

vi.mock('../../models/User', () => ({
  default: { findAll: vi.fn() },
  UserStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
    DEACTIVATED: 'deactivated',
  },
}));

vi.mock('../../services/legal-reminder.service', () => ({
  sendReacceptanceReminder: vi.fn(),
  REMINDER_RATE_LIMIT_DAYS: 7,
  TERMS_REACCEPTANCE_REMINDER_ACTION: 'TERMS_REACCEPTANCE_REMINDER',
  LEGACY_LEGAL_REMINDER_SENT_ACTION: 'LEGAL_REMINDER_SENT',
}));

vi.mock('../../services/legal-content.service', () => ({
  getPendingReacceptance: vi.fn(),
}));

import AuditLog from '../../models/AuditLog';
import User from '../../models/User';
import { sendReacceptanceReminder } from '../../services/legal-reminder.service';
import { getPendingReacceptance } from '../../services/legal-content.service';
import {
  LEGAL_REMINDER_CRON_RAN_ACTION,
  runLegalReminderCron,
} from '../../workers/legal-reminder.worker';

const mockUserFindAll = vi.mocked(User.findAll);
const mockAuditFindAll = vi.mocked(AuditLog.findAll);
const mockAuditCreate = vi.mocked(AuditLog.create);
const mockSend = vi.mocked(sendReacceptanceReminder);
const mockGetPending = vi.mocked(getPendingReacceptance);

const userIdRow = (userId: string) => ({ userId }) as never;

describe('legal reminder cron - runLegalReminderCron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditFindAll.mockResolvedValue([]);
    mockAuditCreate.mockResolvedValue(undefined as never);
  });

  it('returns a zero summary and writes the cron audit row when no users are eligible', async () => {
    mockUserFindAll.mockResolvedValue([]);

    const summary = await runLegalReminderCron({ dryRun: false });

    expect(summary).toEqual({
      totalEligible: 0,
      sent: 0,
      rateLimited: 0,
      errors: 0,
      dryRun: false,
    });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const created = mockAuditCreate.mock.calls[0][0];
    expect(created.action).toBe(LEGAL_REMINDER_CRON_RAN_ACTION);
    expect(created.user).toBeNull();
    const meta = created.metadata as { details: { totalEligible: number; dryRun: boolean } };
    expect(meta.details.totalEligible).toBe(0);
    expect(meta.details.dryRun).toBe(false);
  });

  it('sends to every eligible user when nobody is rate-limited', async () => {
    mockUserFindAll.mockResolvedValue([userIdRow('u1'), userIdRow('u2'), userIdRow('u3')]);
    mockSend.mockResolvedValue({
      sent: true,
      versions: [{ documentType: 'terms', currentVersion: '2026-05-08-v1' }],
    });

    const summary = await runLegalReminderCron({ dryRun: false });

    expect(summary).toEqual({
      totalEligible: 3,
      sent: 3,
      rateLimited: 0,
      errors: 0,
      dryRun: false,
    });
    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(mockSend.mock.calls.map(c => c[0].userId)).toEqual(['u1', 'u2', 'u3']);
    expect(mockSend.mock.calls.every(c => c[0].triggeredBy === 'cron')).toBe(true);
  });

  it('aggregates rate_limited results when sendReacceptanceReminder reports the user was already reminded', async () => {
    mockUserFindAll.mockResolvedValue([userIdRow('u1'), userIdRow('u2')]);
    mockSend.mockResolvedValue({ sent: false, reason: 'rate_limited' });

    const summary = await runLegalReminderCron({ dryRun: false });

    expect(summary).toEqual({
      totalEligible: 2,
      sent: 0,
      rateLimited: 2,
      errors: 0,
      dryRun: false,
    });
  });

  it('does not count users with no pending versions toward the totals', async () => {
    mockUserFindAll.mockResolvedValue([userIdRow('u1'), userIdRow('u2')]);
    mockSend.mockResolvedValue({ sent: false, reason: 'no_pending_versions' });

    const summary = await runLegalReminderCron({ dryRun: false });

    expect(summary).toEqual({
      totalEligible: 0,
      sent: 0,
      rateLimited: 0,
      errors: 0,
      dryRun: false,
    });
  });

  it('continues processing when one user errors and counts the failure', async () => {
    mockUserFindAll.mockResolvedValue([userIdRow('u1'), userIdRow('u2'), userIdRow('u3')]);
    mockSend
      .mockResolvedValueOnce({
        sent: true,
        versions: [{ documentType: 'terms', currentVersion: 'v1' }],
      })
      .mockRejectedValueOnce(new Error('email-provider-down'))
      .mockResolvedValueOnce({
        sent: true,
        versions: [{ documentType: 'terms', currentVersion: 'v1' }],
      });

    const summary = await runLegalReminderCron({ dryRun: false });

    expect(summary).toEqual({
      totalEligible: 3,
      sent: 2,
      rateLimited: 0,
      errors: 1,
      dryRun: false,
    });
    expect(mockSend).toHaveBeenCalledTimes(3);
    const audited = mockAuditCreate.mock.calls[0][0];
    const details = (audited.metadata as { details: { errors: number } }).details;
    expect(details.errors).toBe(1);
  });

  it('does NOT call sendReacceptanceReminder in dry-run mode and flags dryRun in the audit row', async () => {
    mockUserFindAll.mockResolvedValue([userIdRow('u1'), userIdRow('u2')]);
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: 'v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });

    const summary = await runLegalReminderCron({ dryRun: true });

    expect(mockSend).not.toHaveBeenCalled();
    expect(summary).toEqual({
      totalEligible: 2,
      sent: 0,
      rateLimited: 0,
      errors: 0,
      dryRun: true,
    });
    const audited = mockAuditCreate.mock.calls[0][0];
    const details = (audited.metadata as { details: { dryRun: boolean; totalEligible: number } })
      .details;
    expect(details.dryRun).toBe(true);
    expect(details.totalEligible).toBe(2);
  });

  it('only counts users with pending docs as eligible during dry-run', async () => {
    mockUserFindAll.mockResolvedValue([userIdRow('u1'), userIdRow('u2')]);
    mockGetPending
      .mockResolvedValueOnce({
        pending: [
          {
            documentType: 'terms',
            currentVersion: 'v1',
            lastAcceptedVersion: null,
            lastAcceptedAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({ pending: [] });

    const summary = await runLegalReminderCron({ dryRun: true });

    expect(summary.totalEligible).toBe(1);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('honours the batchSize cap even if more eligible users are returned by the candidate query', async () => {
    const candidates = Array.from({ length: 150 }, (_, i) => userIdRow(`u${i}`));
    mockUserFindAll.mockResolvedValue(candidates);
    mockSend.mockResolvedValue({
      sent: true,
      versions: [{ documentType: 'terms', currentVersion: 'v1' }],
    });

    const summary = await runLegalReminderCron({ dryRun: false, batchSize: 100 });

    expect(summary.totalEligible).toBe(100);
    expect(summary.sent).toBe(100);
    expect(mockSend).toHaveBeenCalledTimes(100);
    // The first 100 (sorted oldest-first by the candidate query) win.
    expect(mockSend.mock.calls[0][0].userId).toBe('u0');
    expect(mockSend.mock.calls[99][0].userId).toBe('u99');
  });

  it('excludes users who were reminded inside the rate-limit window from the candidate query', async () => {
    mockAuditFindAll.mockResolvedValue([
      { user: 'recently-reminded-1' } as never,
      { user: 'recently-reminded-2' } as never,
    ]);
    mockUserFindAll.mockResolvedValue([]);

    await runLegalReminderCron({ dryRun: false });

    const userWhereCall = mockUserFindAll.mock.calls[0][0];
    const where = userWhereCall?.where as Record<string, unknown>;
    const userIdClause = where.userId as Record<symbol, unknown[]>;
    expect(userIdClause).toBeDefined();
    const symbols = Object.getOwnPropertySymbols(userIdClause);
    expect(symbols).toHaveLength(1);
    expect(userIdClause[symbols[0]]).toEqual(['recently-reminded-1', 'recently-reminded-2']);
  });
});
