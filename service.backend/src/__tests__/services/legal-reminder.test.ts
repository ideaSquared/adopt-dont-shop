/**
 * ADS-497 (slice 3): behaviour tests for the admin-triggered legal
 * re-acceptance reminder service. The service itself is the only
 * outbound-email path for this feature; tests cover the four documented
 * outcomes (no pending, sent, rate-limited, missing email) plus the
 * version-fingerprint dedupe semantics.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logExternalService: vi.fn(), logSecurity: vi.fn() },
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/AuditLog', () => ({
  default: { findOne: vi.fn() },
  AuditLog: { findOne: vi.fn() },
  withAuditMutationAllowed: vi.fn(),
}));

vi.mock('../../models/User', () => ({
  default: { findByPk: vi.fn() },
}));

vi.mock('../../services/email.service', () => ({
  default: { sendEmail: vi.fn().mockResolvedValue('email-id-123') },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../services/legal-content.service', () => ({
  getPendingReacceptance: vi.fn(),
}));

import AuditLog from '../../models/AuditLog';
import User from '../../models/User';
import { AuditLogService } from '../../services/auditLog.service';
import emailService from '../../services/email.service';
import {
  LEGAL_REMINDER_SENT_ACTION,
  REMINDER_RATE_LIMIT_HOURS,
  sendReacceptanceReminder,
} from '../../services/legal-reminder.service';
import { getPendingReacceptance } from '../../services/legal-content.service';

const mockUserFindByPk = vi.mocked(User.findByPk);
const mockAuditFindOne = vi.mocked(AuditLog.findOne);
const mockSendEmail = vi.mocked(emailService.sendEmail);
const mockAuditLog = vi.mocked(AuditLogService.log);
const mockGetPending = vi.mocked(getPendingReacceptance);

const userRow = {
  userId: 'user-1',
  email: 'jane@example.com',
  firstName: 'Jane',
};

describe('legal-reminder service - sendReacceptanceReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindByPk.mockResolvedValue(userRow as never);
    mockAuditFindOne.mockResolvedValue(null);
  });

  it('returns no_pending_versions when the user is already up to date', async () => {
    mockGetPending.mockResolvedValue({ pending: [] });

    const result = await sendReacceptanceReminder({ userId: 'user-1' });

    expect(result).toEqual({ sent: false, reason: 'no_pending_versions' });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it('sends the email and writes an audit row when the user has pending docs and no recent reminder', async () => {
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: '2025-01-01-v1',
          lastAcceptedAt: '2025-02-01T00:00:00Z',
        },
      ],
    });

    const result = await sendReacceptanceReminder({
      userId: 'user-1',
      triggeredBy: 'admin-7',
    });

    expect(result.sent).toBe(true);
    if (result.sent) {
      expect(result.versions).toEqual([{ documentType: 'terms', currentVersion: '2026-05-08-v1' }]);
    }

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const sendArgs = mockSendEmail.mock.calls[0][0];
    expect(sendArgs.toEmail).toBe('jane@example.com');
    expect(sendArgs.userId).toBe('user-1');
    expect(sendArgs.subject).toContain('Terms of Service');
    expect(sendArgs.htmlContent).toContain('2026-05-08-v1');
    expect(sendArgs.textContent).toContain('Terms of Service');

    expect(mockAuditLog).toHaveBeenCalledTimes(1);
    const auditArgs = mockAuditLog.mock.calls[0][0];
    expect(auditArgs.action).toBe(LEGAL_REMINDER_SENT_ACTION);
    expect(auditArgs.entity).toBe('User');
    expect(auditArgs.entityId).toBe('user-1');
    expect(auditArgs.userId).toBe('user-1');
    expect(auditArgs.details).toMatchObject({
      versionFingerprint: 'terms:2026-05-08-v1',
      versions: [{ documentType: 'terms', currentVersion: '2026-05-08-v1' }],
      triggeredBy: 'admin-7',
    });
  });

  it('rate-limits when an audit row exists for the same versions inside the window', async () => {
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
        {
          documentType: 'privacy',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });
    mockAuditFindOne.mockResolvedValue({
      metadata: {
        details: {
          versionFingerprint: 'privacy:2026-05-08-v1|terms:2026-05-08-v1',
          versions: [
            { documentType: 'terms', currentVersion: '2026-05-08-v1' },
            { documentType: 'privacy', currentVersion: '2026-05-08-v1' },
          ],
          triggeredBy: 'admin-7',
        },
      },
      timestamp: new Date(),
    } as never);

    const result = await sendReacceptanceReminder({ userId: 'user-1' });

    expect(result).toEqual({ sent: false, reason: 'rate_limited' });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it('still sends when a previous audit row has a different version fingerprint (e.g. a newer version was published)', async () => {
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });
    mockAuditFindOne.mockResolvedValue({
      metadata: {
        details: {
          versionFingerprint: 'terms:2025-01-01-v1',
          versions: [{ documentType: 'terms', currentVersion: '2025-01-01-v1' }],
          triggeredBy: null,
        },
      },
      timestamp: new Date(),
    } as never);

    const result = await sendReacceptanceReminder({ userId: 'user-1' });

    expect(result.sent).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it('queries the audit log with a cutoff matching the rate-limit window', async () => {
    mockGetPending.mockResolvedValue({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });

    const before = Date.now();
    await sendReacceptanceReminder({ userId: 'user-1' });
    const after = Date.now();

    expect(mockAuditFindOne).toHaveBeenCalledTimes(1);
    const where = mockAuditFindOne.mock.calls[0][0]?.where as Record<string, unknown>;
    expect(where.user).toBe('user-1');
    expect(where.action).toBe(LEGAL_REMINDER_SENT_ACTION);

    const tsClause = where.timestamp as Record<symbol, Date>;
    const symbols = Object.getOwnPropertySymbols(tsClause);
    expect(symbols).toHaveLength(1);
    const cutoff = tsClause[symbols[0]] as Date;
    const expectedMin = before - REMINDER_RATE_LIMIT_HOURS * 60 * 60 * 1000;
    const expectedMax = after - REMINDER_RATE_LIMIT_HOURS * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it('throws when the user does not exist', async () => {
    mockUserFindByPk.mockResolvedValue(null);

    await expect(sendReacceptanceReminder({ userId: 'nope' })).rejects.toThrow('User not found');

    expect(mockGetPending).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('throws when the user has no email on file', async () => {
    mockUserFindByPk.mockResolvedValue({ ...userRow, email: '' } as never);

    await expect(sendReacceptanceReminder({ userId: 'user-1' })).rejects.toThrow(
      'User has no email address on file'
    );

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('produces a stable version fingerprint regardless of pending order', async () => {
    // Order A: terms first
    mockGetPending.mockResolvedValueOnce({
      pending: [
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
        {
          documentType: 'privacy',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });
    await sendReacceptanceReminder({ userId: 'user-1' });
    const fingerprintA = (mockAuditLog.mock.calls[0][0].details as { versionFingerprint: string })
      .versionFingerprint;

    vi.clearAllMocks();
    mockUserFindByPk.mockResolvedValue(userRow as never);
    mockAuditFindOne.mockResolvedValue(null);

    // Order B: privacy first
    mockGetPending.mockResolvedValueOnce({
      pending: [
        {
          documentType: 'privacy',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
        {
          documentType: 'terms',
          currentVersion: '2026-05-08-v1',
          lastAcceptedVersion: null,
          lastAcceptedAt: null,
        },
      ],
    });
    await sendReacceptanceReminder({ userId: 'user-1' });
    const fingerprintB = (mockAuditLog.mock.calls[0][0].details as { versionFingerprint: string })
      .versionFingerprint;

    expect(fingerprintA).toBe(fingerprintB);
  });
});
