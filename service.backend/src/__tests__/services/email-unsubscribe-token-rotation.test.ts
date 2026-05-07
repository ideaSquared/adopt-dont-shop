/**
 * ADS-301 — explicit revocation path for unsubscribe tokens.
 *
 * The token itself is intentionally not auto-expired (links must keep
 * working in archived emails for CAN-SPAM / consumer-trust reasons), but
 * operators / users must be able to invalidate one on demand. These tests
 * verify the rotation method actually replaces the column with a new
 * crypto-strong value.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logExternalService: vi.fn() },
}));

import { EmailService } from '../../services/email.service';
import EmailPreference from '../../models/EmailPreference';

vi.mock('../../models/EmailPreference');

const MockedEmailPreference = EmailPreference as unknown as {
  findOne: ReturnType<typeof vi.fn>;
  generateUnsubscribeToken: ReturnType<typeof vi.fn>;
};

describe('rotateUnsubscribeToken [ADS-301]', () => {
  const service = new EmailService();
  let updateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    updateMock = vi.fn().mockResolvedValue(undefined);
    MockedEmailPreference.findOne = vi.fn();
    MockedEmailPreference.generateUnsubscribeToken = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a fresh token and persists it to the row', async () => {
    MockedEmailPreference.findOne.mockResolvedValue({ update: updateMock });
    MockedEmailPreference.generateUnsubscribeToken.mockReturnValue('new-token-base64url');

    const newToken = await service.rotateUnsubscribeToken('user-123');

    expect(newToken).toBe('new-token-base64url');
    expect(updateMock).toHaveBeenCalledWith({ unsubscribeToken: 'new-token-base64url' });
    expect(MockedEmailPreference.findOne).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
  });

  it('throws when the user has no preferences row', async () => {
    MockedEmailPreference.findOne.mockResolvedValue(null);

    await expect(service.rotateUnsubscribeToken('user-456')).rejects.toThrow(
      'Email preferences not found'
    );
  });

  it('returns a different token on each call (crypto-strong)', async () => {
    MockedEmailPreference.findOne.mockResolvedValue({ update: updateMock });
    let counter = 0;
    MockedEmailPreference.generateUnsubscribeToken.mockImplementation(() => `token-${counter++}`);

    const a = await service.rotateUnsubscribeToken('user-1');
    const b = await service.rotateUnsubscribeToken('user-1');

    expect(a).not.toBe(b);
  });
});
