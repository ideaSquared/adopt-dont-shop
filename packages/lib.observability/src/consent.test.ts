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

  it('also reacts to cross-tab storage events', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);

    // Simulate another tab writing consent then emitting the native event.
    setAnalyticsConsent('granted');
    listener.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_CONSENT_STORAGE_KEY }));

    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });
});

describe('analytics consent without usable localStorage', () => {
  // When localStorage is missing (SSR, privacy mode) the gate must fail
  // closed (no consent) and never throw.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports no consent when localStorage is absent', () => {
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });

    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('silently ignores writes when localStorage is absent', () => {
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });

    expect(() => setAnalyticsConsent('granted')).not.toThrow();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('fails closed when reading localStorage throws', () => {
    const throwingStore = {
      getItem: () => {
        throw new Error('SecurityError: access denied');
      },
    } as unknown as Storage;
    Object.defineProperty(window, 'localStorage', { value: throwingStore, configurable: true });

    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('swallows errors when writing to localStorage throws (quota / privacy mode)', () => {
    const throwingStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    Object.defineProperty(window, 'localStorage', { value: throwingStore, configurable: true });

    expect(() => setAnalyticsConsent('granted')).not.toThrow();
    expect(() => setAnalyticsConsent('unknown')).not.toThrow();
  });
});

describe('analytics consent in a server-side (no window) environment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a no-op unsubscribe and never registers listeners when window is undefined', () => {
    vi.stubGlobal('window', undefined);

    const listener = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(listener);

    expect(typeof unsubscribe).toBe('function');
    // Calling the returned function must be safe and do nothing.
    expect(() => unsubscribe()).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
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
