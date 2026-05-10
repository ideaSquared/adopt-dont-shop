import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from './consent';
import { initSentry } from './sentry';

// Mock @sentry/react so we can observe whether `Sentry.init` was called.
// vi.spyOn cannot rebind ESM module namespaces; vi.mock must be used and
// any spy referenced inside the factory has to come from vi.hoisted so
// it's available at the (hoisted) mock-evaluation time.
const { sentryInitSpy } = vi.hoisted(() => ({ sentryInitSpy: vi.fn() }));
vi.mock('@sentry/react', () => ({
  init: sentryInitSpy,
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const memoryStore = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) ?? null) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
};

describe('analytics consent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: memoryStore(),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports no consent by default', () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('reports consent once granted', () => {
    setAnalyticsConsent('granted');
    expect(hasAnalyticsConsent()).toBe(true);
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('granted');
  });

  it('reverts to no consent when denied', () => {
    setAnalyticsConsent('granted');
    setAnalyticsConsent('denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('clears storage when set to unknown', () => {
    setAnalyticsConsent('granted');
    setAnalyticsConsent('unknown');
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBeNull();
  });

  it('notifies subscribers when consent changes in the same tab', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);
    setAnalyticsConsent('granted');
    expect(listener).toHaveBeenCalledWith(true);
    setAnalyticsConsent('denied');
    expect(listener).toHaveBeenCalledWith(false);
    unsubscribe();
    setAnalyticsConsent('granted');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('Sentry init bypasses the analytics consent gate', () => {
  // Sentry is classified as strictly necessary for service reliability
  // (cookies policy §5). It must initialise regardless of the analytics
  // consent state — these tests pin that contract so a future refactor
  // can't silently re-introduce a consent gate.
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: memoryStore(),
      configurable: true,
    });
    sentryInitSpy.mockReset();
  });

  it('initialises Sentry when analytics consent has never been granted', () => {
    expect(hasAnalyticsConsent()).toBe(false);

    initSentry({
      dsn: 'https://public@sentry.example/1',
      appName: 'admin',
      environment: 'production',
    });

    expect(sentryInitSpy).toHaveBeenCalledTimes(1);
  });

  it('initialises Sentry even when analytics consent is explicitly denied', () => {
    setAnalyticsConsent('denied');
    expect(hasAnalyticsConsent()).toBe(false);

    initSentry({
      dsn: 'https://public@sentry.example/1',
      appName: 'client',
      environment: 'production',
    });

    expect(sentryInitSpy).toHaveBeenCalledTimes(1);
  });
});
