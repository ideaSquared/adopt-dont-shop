import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  initialRoute?: string;
};

export const renderWithProviders = (ui: ReactElement, options?: RenderWithProvidersOptions) => {
  const { initialRoute = '/', ...renderOptions } = options ?? {};
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider>{children}</ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export * from '@testing-library/react';
export { renderWithProviders as render };
