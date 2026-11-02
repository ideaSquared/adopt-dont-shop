import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

/**
 * All providers wrapper for tests
 * Wraps components with QueryClient, Router, Theme, and other necessary providers
 */
type AllProvidersProps = {
  children: React.ReactNode;
};

// A fresh QueryClient per render so cached responses never leak between tests;
// retries are off so a failed request surfaces immediately instead of after
// the default exponential backoff.
const AllProviders = ({ children }: AllProvidersProps) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Custom render function that wraps components with all necessary providers
 * Use this instead of plain render() from @testing-library/react
 *
 * @example
 * renderWithProviders(<MyComponent />);
 * renderWithProviders(<MyComponent />, { route: '/pets' });
 */
export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { renderWithProviders as render };
