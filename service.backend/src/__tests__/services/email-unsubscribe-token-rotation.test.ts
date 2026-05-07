/**
 * ADS-301 — explicit revocation path for unsubscribe tokens.
 *
 * The token itself is intentionally not auto-expired (links must keep
 * working in archived emails for CAN-SPAM / consumer-trust reasons), but
 * operators / users must be able to invalidate one on demand. These tests
 * verify the rotation method actually replaces the column with a new
 * crypto-strong value.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

// Avoid the EmailService constructor's async ethereal-provider init
// (network call to ethereal.email) by stubbing both providers.
vi.mock('../../services/email-providers/ethereal-provider', () => ({
  EtherealProvider: class {
    initialize = vi.fn().mockResolvedValue(undefined);
    send = vi.fn();
    getName = vi.fn().mockReturnValue('ethereal');
    getPreviewInfo = vi.fn().mockReturnValue(null);
  },
}));

vi.mock('../../models/EmailPreference', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    generateUnsubscribeToken: vi.fn(),
  },
}));

// setup-tests.ts globally mocks './services/email.service' to a stub that
// only exports a default singleton — the EmailService named-export comes
// back undefined under that mock, so we can't `new EmailService()` here.
// Re-import the real module on top of the global mock.
vi.mock('../../services/email.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/email.service')>(
    '../../services/email.service'
  );
  return actual;
});

import EmailPreference from '../../models/EmailPreference';
import { EmailService } from '../../services/email.service';

const MockedEmailPreference = EmailPreference as unknown as {
  findOne: ReturnType<typeof vi.fn>;
  generateUnsubscribeToken: ReturnType<typeof vi.fn>;
};

describe('rotateUnsubscribeToken [ADS-301]', () => {
  let service: EmailService;
  let updateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailService();
    updateMock = vi.fn().mockResolvedValue(undefined);
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
