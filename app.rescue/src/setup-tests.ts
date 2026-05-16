import '@testing-library/jest-dom';
import React from 'react';

// MSW v2 requires web streams APIs that are available in Node.js 18+ but not
// exposed to the jsdom global scope. Polyfill them so MSW can load correctly.
const {
  ReadableStream: NodeReadableStream,
  WritableStream: NodeWritableStream,
  TransformStream: NodeTransformStream,
} = await import('node:stream/web');
if (typeof globalThis.WritableStream === 'undefined') {
  Object.assign(globalThis, {
    ReadableStream: NodeReadableStream,
    WritableStream: NodeWritableStream,
    TransformStream: NodeTransformStream,
  });
}
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver as any;

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock import.meta.env for Vite
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:5000',
    NODE_ENV: 'test',
    DEV: false,
    PROD: false,
    SSR: false,
  },
  configurable: true,
});

// Mock environment utilities
vi.mock('./utils/env', () => ({
  isDevelopment: () => false,
  getApiBaseUrl: () => 'http://localhost:5000',
  getEnvironmentVariable: (_key: string, defaultValue?: string) => defaultValue,
}));

// Mock library dependencies
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
  AuthService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.pets', () => ({
  PetsService: vi.fn(),
  petManagementService: {
    getPets: vi.fn(),
    getPet: vi.fn(),
    createPet: vi.fn(),
    updatePet: vi.fn(),
    deletePet: vi.fn(),
  },
}));

vi.mock('@adopt-dont-shop/lib.applications', () => ({
  ApplicationsService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.rescue', () => ({
  RescueService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.components', () => ({
  lightTheme: {},
  darkTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  Container: ({ children, ...props }: any) => React.createElement('div', props, children),
  Card: ({ children, ...props }: any) => React.createElement('div', props, children),
  CardHeader: ({ children, ...props }: any) => React.createElement('div', props, children),
  CardContent: ({ children, ...props }: any) => React.createElement('div', props, children),
  CardFooter: ({ children, ...props }: any) => React.createElement('div', props, children),
  Button: ({ children, ...props }: any) => React.createElement('button', props, children),
  Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  Heading: ({ children, ...props }: any) => React.createElement('h1', props, children),
  Alert: ({ children, ...props }: any) =>
    React.createElement('div', { role: 'alert', ...props }, children),
  Spinner: (props: any) => React.createElement('div', { 'aria-label': props?.label ?? 'loading' }),
  CheckboxInput: ({ children, ...props }: any) =>
    React.createElement('input', { type: 'checkbox', ...props }, children),
  SelectInput: ({ children, ...props }: any) => React.createElement('select', props, children),
  Badge: ({ children, ...props }: any) => React.createElement('span', props, children),
  Stack: ({ children, ...props }: any) => React.createElement('div', props, children),
  TextInput: ({ children, ...props }: any) =>
    React.createElement('input', { type: 'text', ...props }),
  TextArea: ({ children, ...props }: any) => React.createElement('textarea', props, children),
  // ADS-586: useConfirm / ConfirmDialog mocks so tests can intercept the
  // promise-based confirm flow without rendering the real modal. Default
  // returns `true` so existing flows don't break.
  useConfirm: () => ({
    isOpen: false,
    confirm: vi.fn().mockResolvedValue(true),
    confirmProps: {
      isOpen: false,
      onClose: () => {},
      onConfirm: () => {},
      message: '',
    },
  }),
  ConfirmDialog: () => null,
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));
