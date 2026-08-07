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
  // ADS-1079: shared MetricCard now backs the rescue Analytics stat tiles.
  // Mirror the real formatting so tests asserting on formatted values, helper
  // and delta text (and the loading skeleton) keep working.
  MetricCard: ({
    label,
    value,
    delta,
    format,
    helperText,
    icon,
    loading,
  }: {
    label: string;
    value: number | string;
    delta?: number;
    format?: 'number' | 'percent' | 'currency' | 'duration';
    helperText?: string;
    icon?: React.ReactNode;
    iconColor?: string;
    loading?: boolean;
  }) => {
    const formatValue = (): string => {
      if (typeof value !== 'number') {
        return String(value);
      }
      if (format === 'percent') {
        return `${(value * 100).toFixed(1)}%`;
      }
      if (format === 'currency') {
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          maximumFractionDigits: 0,
        }).format(value);
      }
      if (format === 'duration') {
        const totalSec = Math.round(value);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
      }
      return new Intl.NumberFormat(undefined).format(value);
    };
    return React.createElement(
      'div',
      { 'data-testid': 'metric-card' },
      icon
        ? React.createElement('div', { key: 'icon', 'data-testid': 'metric-card-icon' }, icon)
        : null,
      React.createElement('h4', { key: 'label' }, label),
      loading
        ? React.createElement('div', { key: 'value', 'data-testid': 'metric-card-skeleton' })
        : React.createElement('div', { key: 'value' }, formatValue()),
      !loading && typeof delta === 'number'
        ? React.createElement(
            'div',
            { key: 'delta' },
            `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`
          )
        : null,
      !loading && helperText ? React.createElement('div', { key: 'helper' }, helperText) : null
    );
  },
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
  // Bare input control (label/error come from the wrapping FormField). Strip the
  // presentational-only props so they don't land on the DOM node as attributes.
  Input: ({
    label,
    error,
    helperText,
    isFullWidth,
    startIcon,
    endIcon,
    variant,
    size,
    ...props
  }: any) => React.createElement('input', props),
  TextArea: ({ children, ...props }: any) => React.createElement('textarea', props, children),
  EmptyState: ({ title, description, ...props }: any) =>
    React.createElement(
      'div',
      { role: 'status', ...props },
      React.createElement('h3', null, title),
      description ? React.createElement('p', null, description) : null
    ),
  // ADS UX D6: shared error state. Mirror title/message/retry so tests can
  // assert on the copy and drive the retry button.
  ErrorState: ({ title = 'Something went wrong', message, onRetry, ...props }: any) =>
    React.createElement(
      'div',
      { role: 'alert', ...props },
      React.createElement('h3', null, title),
      message ? React.createElement('p', null, message) : null,
      onRetry
        ? React.createElement('button', { type: 'button', onClick: onRetry }, 'Try again')
        : null
    ),
  // ADS UX D5: shared date-range picker. Render labelled From/To date inputs
  // and mirror the real onChange semantics (each field patches its own side).
  DateRangePicker: ({ value, onChange, fromLabel = 'From', toLabel = 'To', presets }: any) =>
    React.createElement(
      'div',
      null,
      ...(Array.isArray(presets)
        ? presets.map((preset: any) =>
            React.createElement(
              'button',
              { key: preset.label, type: 'button', onClick: () => onChange(preset.getRange()) },
              preset.label
            )
          )
        : []),
      React.createElement('label', { htmlFor: 'drp-from' }, fromLabel),
      React.createElement('input', {
        id: 'drp-from',
        type: 'date',
        value: value?.from ?? '',
        onChange: (e: any) => onChange({ from: e.target.value || null, to: value?.to ?? null }),
      }),
      React.createElement('label', { htmlFor: 'drp-to' }, toLabel),
      React.createElement('input', {
        id: 'drp-to',
        type: 'date',
        value: value?.to ?? '',
        onChange: (e: any) => onChange({ from: value?.from ?? null, to: e.target.value || null }),
      })
    ),
  // Deterministic stand-in for the shared preset builder — distinct fixed
  // ranges so a preset click always changes the range and drives a refetch.
  createDefaultDateRangePresets: () => [
    { label: 'Last 7 days', getRange: () => ({ from: '2026-01-01', to: '2026-01-08' }) },
    { label: 'Last 30 days', getRange: () => ({ from: '2026-01-01', to: '2026-01-31' }) },
    { label: 'Last 90 days', getRange: () => ({ from: '2025-10-01', to: '2026-01-01' }) },
    { label: 'This month', getRange: () => ({ from: '2026-01-01', to: '2026-01-31' }) },
    { label: 'Last month', getRange: () => ({ from: '2025-12-01', to: '2025-12-31' }) },
  ],
  // ADS UX D2: shared responsive DataTable. Mirror the real cell rendering
  // (col.render or stringified value) and empty handling so behaviour tests
  // for the migrated tables keep exercising rows, links and actions.
  DataTable: ({ title, columns, rows, emptyMessage }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'data-table' },
      title ? React.createElement('h4', null, title) : null,
      rows.length === 0
        ? React.createElement('div', null, emptyMessage ?? 'No data')
        : React.createElement(
            'table',
            null,
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                null,
                ...columns.map((c: any) => React.createElement('th', { key: c.key }, c.label))
              )
            ),
            React.createElement(
              'tbody',
              null,
              ...rows.map((row: any, i: number) =>
                React.createElement(
                  'tr',
                  { key: i },
                  ...columns.map((c: any) =>
                    React.createElement(
                      'td',
                      { key: c.key },
                      c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '')
                    )
                  )
                )
              )
            )
          )
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
  FormField: ({
    label,
    htmlFor,
    error,
    description,
    required,
    fullWidth,
    children,
    ...props
  }: any) =>
    React.createElement(
      'div',
      props,
      label ? React.createElement('label', { htmlFor }, label) : null,
      children,
      error ? React.createElement('span', { role: 'alert' }, error) : null,
      !error && description ? React.createElement('span', null, description) : null
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
}));
