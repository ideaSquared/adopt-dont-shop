/**
 * ADS-549 — EmailService provider initialisation must fail loudly in
 * production when the selected provider is misconfigured or the
 * EMAIL_PROVIDER env var holds an unknown value. Falling through to the
 * console provider in production silently consumes every transactional
 * email (password resets, verification links, legal re-acceptance
 * reminders), so we exercise both the misconfig and the unknown-provider
 * paths against a NODE_ENV=production process.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The global setup-tests.ts mocks `./services/email.service` for every
// other test in the suite (only the `default` export, no EmailService
// class). This test exercises the real class, so unmock it explicitly.
vi.unmock('../../services/email.service');

// Stub the secret env-vars so `validateEnv` in `config/env.ts` succeeds
// when the EmailService import pulls config in. Real-shape values
// (length-validated) so the validator doesn't throw at module load.
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'a'.repeat(64);
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'b'.repeat(64);
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'c'.repeat(64);
  process.env.CSRF_SECRET = process.env.CSRF_SECRET ?? 'd'.repeat(64);
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'e'.repeat(64);
  // ADS-542: required in production env validation.
  process.env.UPLOAD_SIGNING_SECRET = process.env.UPLOAD_SIGNING_SECRET ?? 'f'.repeat(64);
  // DB name stubs for whichever NODE_ENV the test resets the modules
  // under — sequelize.ts checks the matching `<ENV>_DB_NAME`.
  process.env.DEV_DB_NAME = process.env.DEV_DB_NAME ?? 'ads_dev';
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'ads_test';
  process.env.PROD_DB_NAME = process.env.PROD_DB_NAME ?? 'ads_prod';
  process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'ads';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'ads';
  process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
  process.env.DB_PORT = process.env.DB_PORT ?? '5432';
});

vi.mock('../../models/AuditLog', () => ({
  AuditLog: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

// Provider mocks are classes (the production code uses `new X()`).
class MockResendProvider {
  validateConfiguration() {
    return false;
  }
  getName() {
    return 'resend';
  }
}
class MockConsoleProvider {
  validateConfiguration() {
    return true;
  }
  getName() {
    return 'console';
  }
}
class MockEtherealProvider {
  async initialize(): Promise<void> {
    return undefined;
  }
  validateConfiguration() {
    return true;
  }
  getName() {
    return 'ethereal';
  }
}

vi.mock('../../services/email-providers/resend-provider', () => ({
  ResendProvider: MockResendProvider,
}));

vi.mock('../../services/email-providers/console-provider', () => ({
  ConsoleEmailProvider: MockConsoleProvider,
}));

vi.mock('../../services/email-providers/ethereal-provider', () => ({
  EtherealProvider: MockEtherealProvider,
}));

vi.mock('../../config', () => ({
  config: {
    email: {
      provider: 'resend',
      from: 'noreply@example.com',
      resend: { apiKey: '', fromEmail: '', fromName: '', replyTo: '' },
    },
  },
}));

const flushAsync = () => new Promise(resolve => setImmediate(resolve));

const importEmailService = async () => {
  // Reset module cache so the mocked `config.email.provider` value is
  // read freshly each test (the EmailService constructor reads it once).
  vi.resetModules();
  const mod = await import('../../services/email.service');
  return mod.EmailService;
};

describe('EmailService provider initialisation [ADS-549]', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // No-op exit so the constructor's `.catch` returns cleanly. The
    // spy still records the call so we can assert on it.
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      return undefined;
    }) as never);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    exitSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('exits non-zero when Resend is misconfigured in production', async () => {
    process.env.NODE_ENV = 'production';
    const EmailService = await importEmailService();
    new EmailService();
    await flushAsync();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('falls back to console in non-production without exiting', async () => {
    process.env.NODE_ENV = 'development';
    const EmailService = await importEmailService();
    new EmailService();
    await flushAsync();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits non-zero in production when EMAIL_PROVIDER is an unknown value', async () => {
    process.env.NODE_ENV = 'production';
    vi.doMock('../../config', () => ({
      config: {
        email: {
          provider: 'sendgrid-typo',
          from: 'noreply@example.com',
          resend: { apiKey: 'x', fromEmail: 'x@example.com' },
        },
      },
    }));
    const EmailService = await importEmailService();
    new EmailService();
    await flushAsync();
    expect(exitSpy).toHaveBeenCalledWith(1);
    vi.doUnmock('../../config');
  });
});
