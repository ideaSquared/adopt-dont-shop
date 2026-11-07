import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 1000;

/**
 * Whole-second countdown driven by the clock, not by timer callbacks: the
 * remaining time is derived from an end timestamp on every tick, so a browser
 * that suspends timers in the background cannot stretch the wait.
 * `hasElapsed` is true once a started countdown has reached zero, and false
 * again when it is restarted.
 */
export const useCountdown = () => {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const secondsLeft = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / TICK_MS));
  const isCounting = secondsLeft > 0;

  useEffect(() => {
    if (!isCounting) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [isCounting]);

  const start = useCallback((seconds: number) => {
    const startedAt = Date.now();
    setNow(startedAt);
    setEndsAt(startedAt + seconds * TICK_MS);
  }, []);

  return {
    secondsLeft,
    hasElapsed: endsAt !== null && secondsLeft === 0,
    start,
  };
};
