import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for debounced actions
 */
export function useDebounce<T extends (...args: unknown[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...(args as Parameters<T>));
      }, delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for managing subscription-based state
 */
export function useSubscription<T>(
  subscribe: (callback: (value: T) => void) => () => void,
  defaultValue: T
) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const unsubscribe = subscribe(setValue);
    return unsubscribe;
  }, [subscribe]);

  return value;
}
