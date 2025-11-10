import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PermissionsProvider } from '../contexts/PermissionsContext';
import { ChatProvider } from '../contexts/ChatContext';

/**
 * Custom render function that wraps component with all necessary providers
 */
type CustomRenderOptions = RenderOptions & {
  authState?: {
    user: {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      rescueId: string;
    } | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  permissions?: string[];
  initialRoute?: string;
  queryClient?: QueryClient;
};

const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * Wrapper component that provides all necessary contexts
 */
type AllProvidersProps = {
  children: ReactNode;
  authState?: CustomRenderOptions['authState'];
  permissions?: string[];
  queryClient: QueryClient;
};

const AllProviders = ({ children, queryClient }: AllProvidersProps): ReactElement => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PermissionsProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </PermissionsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export const renderWithAllProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> => {
  const {
    authState,
    permissions,
    initialRoute = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  // Mock useAuth if authState is provided
  if (authState) {
    jest.spyOn(require('../contexts/AuthContext'), 'useAuth').mockReturnValue({
      ...authState,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
      refreshUser: jest.fn(),
    });
  }

  // Set initial route if specified
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <AllProviders authState={authState} permissions={permissions} queryClient={queryClient}>
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Render with authentication context only
 */
export const renderWithAuth = (
  ui: ReactElement,
  authState: CustomRenderOptions['authState'],
  options?: RenderOptions
): ReturnType<typeof render> => {
  return renderWithAllProviders(ui, { ...options, authState });
};

/**
 * Render with router only
 */
export const renderWithRouter = (
  ui: ReactElement,
  initialRoute = '/',
  options?: RenderOptions
): ReturnType<typeof render> => {
  return renderWithAllProviders(ui, { ...options, initialRoute });
};

/**
 * Render with permissions context
 */
export const renderWithPermissions = (
  ui: ReactElement,
  permissions: string[],
  options?: RenderOptions
): ReturnType<typeof render> => {
  return renderWithAllProviders(ui, { ...options, permissions });
};

/**
 * Create a mock authenticated user
 */
export const createMockUser = (overrides = {}) => ({
  userId: 'test-user-id',
  email: 'test@rescue.org',
  firstName: 'Test',
  lastName: 'User',
  role: 'STAFF',
  rescueId: 'test-rescue-id',
  ...overrides,
});

/**
 * Create mock auth state
 */
export const createMockAuthState = (overrides = {}) => ({
  user: createMockUser(),
  isAuthenticated: true,
  isLoading: false,
  ...overrides,
});

/**
 * Wait for loading states to complete
 */
export const waitForLoadingToFinish = async (): Promise<void> => {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
    expect(loadingElements.length).toBe(0);
  }, { timeout: 3000 });
};
