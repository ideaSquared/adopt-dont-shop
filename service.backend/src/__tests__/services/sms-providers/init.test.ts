/**
 * ADS-611 — provider-factory smoke tests.
 *
 * `getSmsProvider()` is the only entry point any service uses to send
 * SMS, so the factory's selection / production-guard / misconfig-fail
 * contract is worth pinning down. Pattern mirrors
 * `av-providers/init.test.ts` (ADS-602).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type LoadedModule = {
  getSmsProvider: () => { getName: () => string };
  resetSmsProviderForTests: () => void;
};

const loadFactoryWithConfig = async (smsConfig: {
  provider: string;
  twilio?: { accountSid?: string; authToken?: string; fromNumber?: string };
}): Promise<LoadedModule> => {
  vi.resetModules();
  vi.doMock('../../../config', () => ({
    config: {
      sms: {
        provider: smsConfig.provider,
        twilio: smsConfig.twilio ?? {},
      },
    },
  }));
  vi.doMock('../../../utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    loggerHelpers: { logExternalService: vi.fn() },
  }));
  return await import('../../../services/sms-providers');
};

describe('getSmsProvider', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.doUnmock('../../../config');
    vi.doUnmock('../../../utils/logger');
  });

  it('selects the console provider in development', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    const provider = mod.getSmsProvider();
    expect(provider.getName()).toBe('Console SMS Provider');
    mod.resetSmsProviderForTests();
  });

  it('refuses the console provider in production', async () => {
    process.env.NODE_ENV = 'production';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    expect(() => mod.getSmsProvider()).toThrow(
      /SMS_PROVIDER=console is not permitted in production/
    );
    mod.resetSmsProviderForTests();
  });

  it('falls back to console for an unknown provider in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'mystery-vendor' });
    const provider = mod.getSmsProvider();
    expect(provider.getName()).toBe('Console SMS Provider');
    mod.resetSmsProviderForTests();
  });

  it('refuses an unknown provider in production', async () => {
    process.env.NODE_ENV = 'production';
    const mod = await loadFactoryWithConfig({ provider: 'mystery-vendor' });
    expect(() => mod.getSmsProvider()).toThrow(/Unknown SMS_PROVIDER value: "mystery-vendor"/);
    mod.resetSmsProviderForTests();
  });

  it('rejects twilio at construction time when required credentials are missing', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'twilio', twilio: {} });
    expect(() => mod.getSmsProvider()).toThrow(
      /Twilio SMS provider misconfigured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER are required/
    );
    mod.resetSmsProviderForTests();
  });

  it('caches the resolved provider so subsequent calls return the same instance', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    const first = mod.getSmsProvider();
    const second = mod.getSmsProvider();
    expect(second).toBe(first);
    mod.resetSmsProviderForTests();
  });

  it('resetSmsProviderForTests releases the cache so a re-init picks new config', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    const first = mod.getSmsProvider();
    mod.resetSmsProviderForTests();
    const second = mod.getSmsProvider();
    expect(second).not.toBe(first);
  });
});
