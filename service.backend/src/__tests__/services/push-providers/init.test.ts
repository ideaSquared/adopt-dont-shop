/**
 * ADS-611 — provider-factory smoke tests.
 *
 * `getPushProvider()` is the only entry point any service uses to send
 * push notifications, so the factory's selection / production-guard /
 * misconfig-fail contract is worth pinning down. Pattern mirrors
 * `av-providers/init.test.ts` (ADS-602).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type LoadedModule = {
  getPushProvider: () => { getName: () => string };
  resetPushProviderForTests: () => void;
};

const loadFactoryWithConfig = async (pushConfig: {
  provider: string;
  fcm?: { serviceAccountJson?: string; projectId?: string };
}): Promise<LoadedModule> => {
  vi.resetModules();
  vi.doMock('../../../config', () => ({
    config: {
      push: {
        provider: pushConfig.provider,
        fcm: pushConfig.fcm ?? {},
      },
    },
  }));
  vi.doMock('../../../utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    loggerHelpers: { logExternalService: vi.fn() },
  }));
  return await import('../../../services/push-providers');
};

describe('getPushProvider', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.doUnmock('../../../config');
    vi.doUnmock('../../../utils/logger');
  });

  it('selects the console provider in development', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    const provider = mod.getPushProvider();
    expect(provider.getName()).toBe('console');
    mod.resetPushProviderForTests();
  });

  it('refuses the console provider in production', async () => {
    process.env.NODE_ENV = 'production';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    expect(() => mod.getPushProvider()).toThrow(
      /PUSH_PROVIDER=console is not permitted in production/
    );
    mod.resetPushProviderForTests();
  });

  it('falls back to console for an unknown provider in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'mystery-vendor' });
    const provider = mod.getPushProvider();
    expect(provider.getName()).toBe('console');
    mod.resetPushProviderForTests();
  });

  it('refuses an unknown provider in production', async () => {
    process.env.NODE_ENV = 'production';
    const mod = await loadFactoryWithConfig({ provider: 'mystery-vendor' });
    expect(() => mod.getPushProvider()).toThrow(/Unknown PUSH_PROVIDER value: "mystery-vendor"/);
    mod.resetPushProviderForTests();
  });

  it('rejects fcm at construction time when required credentials are missing', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'fcm', fcm: {} });
    expect(() => mod.getPushProvider()).toThrow(
      /FCM push provider misconfigured: FCM_SERVICE_ACCOUNT_JSON and FCM_PROJECT_ID are required/
    );
    mod.resetPushProviderForTests();
  });

  it('caches the resolved provider so subsequent calls return the same instance', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    const first = mod.getPushProvider();
    const second = mod.getPushProvider();
    expect(second).toBe(first);
    mod.resetPushProviderForTests();
  });

  it('resetPushProviderForTests releases the cache so a re-init picks new config', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'console' });
    const first = mod.getPushProvider();
    mod.resetPushProviderForTests();
    const second = mod.getPushProvider();
    expect(second).not.toBe(first);
  });
});
