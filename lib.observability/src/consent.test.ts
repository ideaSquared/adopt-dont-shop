import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from './consent';

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
