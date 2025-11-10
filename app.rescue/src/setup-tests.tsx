import '@testing-library/jest-dom';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock import.meta for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5000',
        NODE_ENV: 'test',
      },
    },
  },
});

// Mock environment utilities
jest.mock('./utils/env', () => ({
  isDevelopment: () => false,
  getApiBaseUrl: () => 'http://localhost:5000',
  getEnvironmentVariable: (_key: string, defaultValue?: string) => defaultValue,
}));

// Mock AuthContext
jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    refreshUser: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
