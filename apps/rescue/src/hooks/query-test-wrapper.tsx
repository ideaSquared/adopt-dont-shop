import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * renderHook wrapper that gives each test a fresh QueryClient (no cache leaks
 * between tests, no retries so failures surface immediately).
 */
export const QueryWrapper = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
