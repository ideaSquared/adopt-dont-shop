import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@adopt-dont-shop/components';
import {
  PermissionsProvider,
  AnalyticsProvider,
  NotificationsProvider,
  ChatProvider,
} from './mock-providers';
import { FavoritesProvider } from '@/contexts/FavoritesContext';

/**
 * Custom render function that wraps components with all necessary providers
 * Use this instead of RTL's render for all component tests
 */
type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  initialRoute?: string;
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const renderWithProviders = (
  ui: ReactElement,
  { initialRoute = '/', ...renderOptions }: CustomRenderOptions = {}
) => {
  // Set initial route
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PermissionsProvider>
            <AnalyticsProvider>
              <NotificationsProvider>
                <ChatProvider>
                  <FavoritesProvider>{children}</FavoritesProvider>
                </ChatProvider>
              </NotificationsProvider>
            </AnalyticsProvider>
          </PermissionsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

/**
 * Helper to wait for loading states to complete
 */
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * Mock localStorage for tests
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
};

/**
 * Setup localStorage mock before each test
 */
export const setupLocalStorageMock = () => {
  const localStorageMock = mockLocalStorage();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
