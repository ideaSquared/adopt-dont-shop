import '@testing-library/jest-dom';
import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';

// MSW 2.x requires the Web Streams API, which jsdom does not provide
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
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

// Mock Image constructor for preloading tests
global.Image = class MockImage {
  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload(new Event('load'));
      }
    }, 100);
  }
  onload: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  src: string = '';
} as any;

vi.mock('@adopt-dont-shop/lib.components', () => ({
  lightTheme: {},
  darkTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  Container: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Card: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Button: ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) =>
    React.createElement('button', props, children),
  Text: ({ children, ...props }: React.ComponentPropsWithoutRef<'span'>) =>
    React.createElement('span', props, children),
  Heading: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) =>
    React.createElement('h1', props, children),
  Input: (props: React.ComponentPropsWithoutRef<'input'>) => React.createElement('input', props),
  Modal: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Spinner: () => React.createElement('div', { 'aria-label': 'loading' }),
  DateTime: ({ value }: { value: string }) => React.createElement('span', null, value),
  ConfirmDialog: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  // ADS-585: useConfirm mock returns both `confirm` and `confirmProps` so tests
  // covering pages that spread `confirmProps` into ConfirmDialog don't crash.
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
  // ADS-585: toast.* is the replacement for native window.alert in app.admin.
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
  useToast: () => {
    const [toasts, setToasts] = React.useState<
      Array<{ id: string; message: string; type: string }>
    >([]);
    const showToast = React.useCallback((message: string, type: string) => {
      const id = String(Date.now() + Math.random());
      setToasts(prev => [...prev, { id, message, type }]);
    }, []);
    const hideToast = React.useCallback((id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    return { toasts, showToast, hideToast };
  },
  Toast: ({
    message,
    ...props
  }: {
    message: string;
    id: string;
    type: string;
    onClose: (id: string) => void;
    position: string;
  }) => React.createElement('div', { role: 'status', ...props }, message),
  ToastContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'toast-container' }, children),
}));
