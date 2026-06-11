import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` has
 * elapsed without further changes. Useful for keeping fast-changing inputs
 * (e.g. search boxes) decoupled from expensive consumers like API queries.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
};
