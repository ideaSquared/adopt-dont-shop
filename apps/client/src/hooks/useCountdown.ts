import { useCallback, useEffect, useState } from 'react';

type CountdownState = { remaining: number; started: boolean };

const TICK_MS = 1000;

/**
 * Whole-second countdown. `hasElapsed` is true once a started countdown has
 * reached zero, and false again when it is restarted.
 */
export const useCountdown = () => {
  const [state, setState] = useState<CountdownState>({ remaining: 0, started: false });

  const isCounting = state.remaining > 0;

  useEffect(() => {
    if (!isCounting) {
      return;
    }
    const id = setInterval(() => {
      setState(current => ({ ...current, remaining: Math.max(0, current.remaining - 1) }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isCounting]);

  const start = useCallback((seconds: number) => {
    setState({ remaining: seconds, started: true });
  }, []);

  return {
    secondsLeft: state.remaining,
    hasElapsed: state.started && state.remaining === 0,
    start,
  };
};
