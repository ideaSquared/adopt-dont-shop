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
  Stack: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Card: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  EmptyState: ({
    title,
    description,
    ...props
  }: {
    title: string;
    description?: string;
    [k: string]: unknown;
  }) =>
    React.createElement(
      'div',
      { role: 'status', ...props },
      React.createElement('h3', null, title),
      description ? React.createElement('p', null, description) : null
    ),
  FormSection: ({
    title,
    description,
    children,
    ...props
  }: {
    title?: string;
    description?: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement(
      'section',
      props,
      title ? React.createElement('h3', null, title) : null,
      description ? React.createElement('p', null, description) : null,
      children
    ),
  FormRow: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  FormField: ({
    label,
    error,
    description,
    children,
    ...props
  }: {
    label?: string;
    error?: string;
    description?: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement(
      'div',
      props,
      label ? React.createElement('label', null, label) : null,
      children,
      error ? React.createElement('span', { role: 'alert' }, error) : null,
      description ? React.createElement('span', null, description) : null
    ),
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
  Skeleton: ({ width, height, radius, className, style, ...props }: Record<string, unknown>) =>
    React.createElement('div', {
      'aria-hidden': 'true',
      style: { width, height, borderRadius: radius, ...((style as React.CSSProperties) ?? {}) },
      ...props,
    }),
  SkeletonText: ({ lines = 3 }: { lines?: number }) =>
    React.createElement(
      'div',
      { 'aria-hidden': 'true' },
      ...Array.from({ length: lines as number }, (_, i) => React.createElement('div', { key: i }))
    ),
  SkeletonTableRow: ({
    columnCount,
    hasCheckbox,
  }: {
    columnCount: number;
    hasCheckbox?: boolean;
  }) =>
    React.createElement(
      'tr',
      { 'aria-hidden': 'true', 'data-testid': 'skeleton-row' },
      hasCheckbox ? React.createElement('td', { key: 'cb' }) : null,
      ...Array.from({ length: columnCount as number }, (_, i) =>
        React.createElement('td', { key: i })
      )
    ),
  SkeletonCard: ({ lines = 3, showAvatar }: { lines?: number; showAvatar?: boolean }) =>
    React.createElement(
      'div',
      { 'aria-hidden': 'true' },
      showAvatar ? React.createElement('div', { key: 'avatar' }) : null,
      React.createElement(
        'div',
        { key: 'text' },
        ...Array.from({ length: lines as number }, (_, i) => React.createElement('div', { key: i }))
      )
    ),
  DateTime: ({ value }: { value: string }) => React.createElement('span', null, value),
  ConfirmDialog: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  SkipLink: ({
    href = '#main-content',
    children = 'Skip to main content',
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => React.createElement('a', { href }, children),
  // ADS C4-5: rendered by SanctionBannerHost; tests don't exercise sanctions.
  SanctionBanner: () => null,
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
  // EntityInspector — minimal mock that renders the header, every tab as a
  // role="tab" button, the close button (if onClose provided), and the
  // active tab body. Mirrors the real component's a11y surface so tests
  // that find tabs by role/name keep working.
  EntityInspector: ({
    header,
    tabs,
    defaultTabId,
    onClose,
    closeLabel,
    'data-testid': testId,
  }: {
    header: React.ReactNode;
    tabs: ReadonlyArray<{ id: string; label: string; content: React.ReactNode }>;
    defaultTabId?: string;
    onClose?: () => void;
    closeLabel?: string;
    'data-testid'?: string;
  }) => {
    const initialId =
      defaultTabId && tabs.some(t => t.id === defaultTabId) ? defaultTabId : (tabs[0]?.id ?? null);
    const [activeId, setActiveId] = React.useState<string | null>(initialId);
    const active = tabs.find(t => t.id === activeId) ?? null;
    return React.createElement(
      'div',
      { 'data-testid': testId },
      React.createElement('div', { key: 'header' }, header),
      onClose
        ? React.createElement(
            'button',
            {
              key: 'close',
              type: 'button',
              onClick: onClose,
              'aria-label': closeLabel ?? 'Close inspector',
            },
            '✕'
          )
        : null,
      React.createElement(
        'div',
        { key: 'tabs', role: 'tablist' },
        ...tabs.map(t =>
          React.createElement(
            'button',
            {
              key: t.id,
              type: 'button',
              role: 'tab',
              'aria-selected': t.id === activeId,
              onClick: () => setActiveId(t.id),
            },
            t.label
          )
        )
      ),
      React.createElement('div', { key: 'panel', role: 'tabpanel' }, active?.content ?? null)
    );
  },
}));
