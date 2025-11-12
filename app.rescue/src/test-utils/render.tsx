import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '@adopt-dont-shop/components';

/**
 * All providers wrapper for tests
 * Wraps components with Router, Theme, and other necessary providers
 */
type AllProvidersProps = {
  children: React.ReactNode;
};

const AllProviders = ({ children }: AllProvidersProps) => (
  <BrowserRouter>
    <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
  </BrowserRouter>
);

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
