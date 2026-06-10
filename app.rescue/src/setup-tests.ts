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
  Skeleton: ({ width, height, radius, className, style, ...props }: any) =>
    React.createElement('div', {
      'aria-hidden': 'true',
      style: { width, height, borderRadius: radius, ...(style ?? {}) },
      ...props,
    }),
  SkeletonText: ({ lines = 3 }: any) =>
    React.createElement(
      'div',
      { 'aria-hidden': 'true' },
      ...Array.from({ length: lines }, (_, i) => React.createElement('div', { key: i }))
    ),
  SkeletonTableRow: ({ columnCount, hasCheckbox }: any) =>
    React.createElement(
      'tr',
      { 'aria-hidden': 'true', 'data-testid': 'skeleton-row' },
      hasCheckbox ? React.createElement('td', { key: 'cb' }) : null,
      ...Array.from({ length: columnCount }, (_, i) => React.createElement('td', { key: i }))
    ),
  SkeletonCard: ({ lines = 3, showAvatar }: any) =>
    React.createElement(
      'div',
      { 'aria-hidden': 'true' },
      showAvatar ? React.createElement('div', { key: 'avatar' }) : null,
      React.createElement(
        'div',
        { key: 'text' },
        ...Array.from({ length: lines }, (_, i) => React.createElement('div', { key: i }))
      )
    ),
  CheckboxInput: ({ children, ...props }: any) =>
    React.createElement('input', { type: 'checkbox', ...props }, children),
  SelectInput: ({ children, ...props }: any) => React.createElement('select', props, children),
  Badge: ({ children, ...props }: any) => React.createElement('span', props, children),
  Stack: ({ children, ...props }: any) => React.createElement('div', props, children),
  TextInput: ({ children, ...props }: any) =>
    React.createElement('input', { type: 'text', ...props }),
  TextArea: ({ children, ...props }: any) => React.createElement('textarea', props, children),
  EmptyState: ({ title, description, ...props }: any) =>
    React.createElement(
      'div',
      { role: 'status', ...props },
      React.createElement('h3', null, title),
      description ? React.createElement('p', null, description) : null
    ),
  FormSection: ({ title, description, children, ...props }: any) =>
    React.createElement(
      'section',
      props,
      title ? React.createElement('h3', null, title) : null,
      description ? React.createElement('p', null, description) : null,
      children
    ),
  FormRow: ({ children, ...props }: any) => React.createElement('div', props, children),
  FormField: ({ label, error, description, children, ...props }: any) =>
    React.createElement(
      'div',
      props,
      label ? React.createElement('label', null, label) : null,
      children,
      error ? React.createElement('span', { role: 'alert' }, error) : null,
      description ? React.createElement('span', null, description) : null
    ),
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
  // Render Modal contents inline when open so tests can interact with the
  // form fields without needing a portal target. Matching the real Modal
  // API ensures pages that depend on `title` get the heading rendered.
  Modal: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
  }) =>
    isOpen
      ? React.createElement(
          'div',
          { role: 'dialog' },
          title ? React.createElement('h2', null, title) : null,
          children
        )
      : null,
  InstallPwaBanner: () => null,
  // ADS C4-5: rendered by SanctionBannerHost; tests don't exercise sanctions.
  SanctionBanner: () => null,
  SkipLink: ({
    href = '#main-content',
    children = 'Skip to main content',
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => React.createElement('a', { href }, children),
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
  PetImage: ({
    src,
    alt,
    className,
  }: {
    src?: string;
    alt: string;
    className?: string;
    eager?: boolean;
  }) => React.createElement('img', { src, alt, className }),
}));
