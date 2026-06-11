import { createContext, useContext } from 'react';

/**
 * Base context factory for creating type-safe contexts with error handling
 */
export function createAppContext<T>(name: string) {
  const Context = createContext<T | undefined>(undefined);

  const useContextHook = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(`use${name} must be used within a ${name}Provider`);
    }
    return context;
  };

  return [Context, useContextHook] as const;
}

/**
 * Common error state interface
 */
export interface ErrorState {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Common loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

/**
 * Base async action handler with consistent error handling
 */
export async function handleAsyncAction<T>(
  action: () => Promise<T>,
  options: {
    setLoading?: (loading: boolean) => void;
    setError?: (error: string | null) => void;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<T | null> {
  const { setLoading, setError, onSuccess, onError } = options;

  try {
    setLoading?.(true);
    setError?.(null);

    const result = await action();
    onSuccess?.(result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setError?.(errorMessage);
    onError?.(error as Error);
    console.error('Async action failed:', error);
    return null;
  } finally {
    setLoading?.(false);
  }
}
