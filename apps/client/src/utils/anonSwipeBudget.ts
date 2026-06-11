/**
 * ADS-625: track anonymous swipe count in localStorage so the soft-block
 * paywall can fire after N swipes. Counter is intentionally separate
 * from the discoverySession `viewedPetIds` cap — that one bounds
 * storage size, this one drives a conversion modal.
 *
 * Threshold N is configurable via `VITE_ANON_SWIPE_LIMIT` so the
 * product team can tune the value without a code change. Default 7.
 *
 * Counter resets to 0 on successful signup/login — see
 * `resetAnonSwipeBudget()`, called from the auth context's success
 * handlers.
 */

const STORAGE_KEY = 'anon_swipe_budget.count';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseNumericEnv = (raw: unknown, fallback: number): number => {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const resolveLimit = (): number => {
  // `import.meta.env` is the Vite-side runtime config. When tests mock
  // the env, the override flows through transparently.
  if (typeof import.meta !== 'undefined' && import.meta?.env) {
    return parseNumericEnv((import.meta.env as Record<string, unknown>).VITE_ANON_SWIPE_LIMIT, 7);
  }
  return 7;
};

export const ANON_SWIPE_LIMIT = resolveLimit();

export const getAnonSwipeCount = (): number => {
  if (!isBrowser) {
    return 0;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const incrementAnonSwipeCount = (): number => {
  const next = getAnonSwipeCount() + 1;
  if (isBrowser) {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }
  return next;
};

export const resetAnonSwipeBudget = (): void => {
  if (isBrowser) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export const hasReachedAnonSwipeLimit = (count = getAnonSwipeCount()): boolean =>
  count >= ANON_SWIPE_LIMIT;
