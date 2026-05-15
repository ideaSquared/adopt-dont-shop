import '@testing-library/jest-dom';
import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

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
  decoding: string = 'auto';
} as any;

// Mock IntersectionObserver. The default behaviour is to fire intersection
// immediately so lazy-loaded components reveal their content in tests.
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

vi.mock('@adopt-dont-shop/lib.components', () => ({
  lightTheme: {},
  darkTheme: {},
  highContrastTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  // ADS-137: keep mocks of high-contrast exports in sync with lib.components.
  HIGH_CONTRAST_SHORTCUT_HINT: 'Alt + Shift + H',
  HighContrastToggle: () =>
    React.createElement('button', { type: 'button', 'aria-pressed': 'false' }, 'High contrast'),
  useTheme: () => ({
    theme: {},
    themeMode: 'light',
    setThemeMode: () => {},
    highContrast: false,
    setHighContrast: () => {},
    toggleHighContrast: () => {},
  }),
  Container: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Card: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Button: ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) =>
    React.createElement('button', props, children),
  Input: (props: React.ComponentPropsWithoutRef<'input'>) => React.createElement('input', props),
  TextArea: (props: React.ComponentPropsWithoutRef<'textarea'>) =>
    React.createElement('textarea', props),
  Modal: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', props, children),
  Spinner: () => React.createElement('div', { 'aria-label': 'loading' }),
  Alert: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) =>
    React.createElement('div', { role: 'alert', ...props }, children),
  Badge: ({
    children,
    max,
    variant,
    ...props
  }: React.ComponentPropsWithoutRef<'span'> & { max?: number; variant?: string }) => {
    const count = typeof children === 'number' ? children : undefined;
    const display = max !== undefined && count !== undefined && count > max ? `${max}+` : children;
    return React.createElement('span', props, display);
  },
  Avatar: ({
    src,
    alt,
    name,
    ...props
  }: {
    src?: string;
    alt?: string;
    name?: string;
    size?: string;
  }) => {
    if (name && !src) {
      const initials = name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return React.createElement('span', { 'aria-label': name, ...props }, initials);
    }
    return React.createElement('img', { src, alt, ...props });
  },
  FileUpload: ({
    onFilesSelect,
    accept,
    multiple,
    maxSize,
    onError,
    label,
    'data-testid': testId,
    ...props
  }: {
    onFilesSelect?: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    maxFiles?: number;
    onError?: (msg: string) => void;
    label?: string;
    'data-testid'?: string;
    [key: string]: unknown;
  }) =>
    React.createElement('input', {
      type: 'file',
      accept,
      multiple,
      'data-testid': testId ?? 'file-upload',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (maxSize) {
          const oversized = files.filter(f => f.size > maxSize);
          if (oversized.length > 0) {
            onError?.(`File too large`);
            return;
          }
        }
        onFilesSelect?.(files);
      },
    }),
  Footer: ({
    children,
    extraLinks,
    ...props
  }: React.ComponentPropsWithoutRef<'footer'> & { extraLinks?: React.ReactNode }) =>
    React.createElement('footer', props, children, extraLinks),
  TextInput: ({
    label,
    id,
    ...props
  }: React.ComponentPropsWithoutRef<'input'> & { label?: string }) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return React.createElement(
      'div',
      null,
      label && React.createElement('label', { htmlFor: inputId }, label),
      React.createElement('input', { id: inputId, type: 'text', ...props })
    );
  },
  SelectInput: ({
    label,
    id,
    value,
    onChange,
    options = [],
    ...props
  }: {
    label?: string;
    id?: string;
    value?: string;
    onChange?: (v: string) => void;
    options?: Array<{ value: string; label: string }>;
  }) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return React.createElement(
      'div',
      null,
      label && React.createElement('label', { htmlFor: inputId }, label),
      React.createElement(
        'select',
        {
          id: inputId,
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
          ...props,
        },
        options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
      )
    );
  },
}));
