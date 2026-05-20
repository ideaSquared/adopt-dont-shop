import { describe, it, expect, vi, beforeEach } from 'vitest';

// ADS-605: behaviour tests for the admin-acting-on-subject audit trail.
// Models and the AuditLogService are stubbed so we can assert which
// userId the audit row is attributed to without touching a database.

const mockUser = {
  userId: 'subject-user-1',
  email: 'subject@example.com',
  status: 'active',
  save: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../models/User', () => {
  const findByPk = vi.fn();
  return {
    default: { findByPk },
    UserStatus: { DEACTIVATED: 'deactivated' },
  };
});

vi.mock('../../models/Application', () => ({
  default: { update: vi.fn().mockResolvedValue([0]) },
}));
vi.mock('../../models/RefreshToken', () => ({
  default: { update: vi.fn().mockResolvedValue([0]) },
}));
vi.mock('../../models/UserFavorite', () => ({
  default: { destroy: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../models/ChatParticipant', () => ({
  default: { destroy: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import User from '../../models/User';
import { AuditLogService } from '../../services/auditLog.service';
import {
  buildAnonymousPlaceholder,
  requestAccountDeletion,
} from '../../services/data-deletion.service';

const mockFindByPk = User.findByPk as ReturnType<typeof vi.fn>;
const mockAuditLog = AuditLogService.log as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFindByPk.mockResolvedValue({ ...mockUser });
});

describe('buildAnonymousPlaceholder', () => {
  it('returns a deterministic placeholder for the same userId', () => {
    const a = buildAnonymousPlaceholder('user-123');
    const b = buildAnonymousPlaceholder('user-123');
    expect(a).toBe(b);
  });

  it('produces different placeholders for different userIds', () => {
    expect(buildAnonymousPlaceholder('user-1')).not.toBe(buildAnonymousPlaceholder('user-2'));
  });

  it('starts with deleted-user- prefix and ends with a 12-hex digest', () => {
    const placeholder = buildAnonymousPlaceholder('any');
    expect(placeholder).toMatch(/^deleted-user-[0-9a-f]{12}$/);
  });

  it('produces a value short enough to fit in firstName/lastName (≤100 chars)', () => {
    const placeholder = buildAnonymousPlaceholder('verylongidentifier-' + 'x'.repeat(200));
    expect(placeholder.length).toBeLessThanOrEqual(100);
  });
});

describe('requestAccountDeletion audit trail (ADS-605)', () => {
  it('writes exactly one audit entry attributed to the subject for self-service deletion', async () => {
    await requestAccountDeletion('subject-user-1', 'no longer needed');

    expect(mockAuditLog).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'subject-user-1',
        action: 'GDPR_DELETE_REQUESTED',
        entityId: 'subject-user-1',
      })
    );
  });

  it('writes a second audit entry attributed to the admin when an admin triggers the deletion', async () => {
    await requestAccountDeletion('subject-user-1', 'support request', {
      userId: 'admin-user-7',
      userType: 'admin',
    });

    expect(mockAuditLog).toHaveBeenCalledTimes(2);
    expect(mockAuditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'subject-user-1',
        action: 'GDPR_DELETE_REQUESTED',
        entityId: 'subject-user-1',
      })
    );
    expect(mockAuditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'admin-user-7',
        action: 'GDPR_DELETE_REQUESTED_BY_ADMIN',
        entityId: 'subject-user-1',
        details: expect.objectContaining({
          reason: 'support request',
          actorUserType: 'admin',
          targetUserId: 'subject-user-1',
        }),
      })
    );
  });

  it('does not write a second entry when the actor IS the subject (self-service path passing actor)', async () => {
    await requestAccountDeletion('subject-user-1', undefined, {
      userId: 'subject-user-1',
      userType: 'adopter',
    });

    expect(mockAuditLog).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'GDPR_DELETE_REQUESTED' })
    );
  });
});
