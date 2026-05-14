/**
 * ADS-549 — EmailService provider initialisation must fail loudly in
 * production when the selected provider is misconfigured or the
 * EMAIL_PROVIDER env var holds an unknown value. Falling through to the
 * console provider in production silently consumes every transactional
 * email (password resets, verification links, legal re-acceptance
 * reminders), so we exercise both the misconfig and the unknown-provider
 * paths against a NODE_ENV=production process.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../../services/email-providers/resend-provider', () => ({
  ResendProvider: vi.fn().mockImplementation(() => ({
    validateConfiguration: () => false,
    getName: () => 'resend',
  })),
}));

vi.mock('../../services/email-providers/console-provider', () => ({
  ConsoleEmailProvider: vi.fn().mockImplementation(() => ({
    validateConfiguration: () => true,
    getName: () => 'console',
  })),
}));

vi.mock('../../services/email-providers/ethereal-provider', () => ({
  EtherealProvider: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    validateConfiguration: () => true,
    getName: () => 'ethereal',
  })),
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
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code ?? ''}) called`);
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
