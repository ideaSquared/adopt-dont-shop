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
  normalTheme: {},
  darkTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  ThemeToggle: () => React.createElement('button', { type: 'button' }, 'Theme'),
  useTheme: () => ({
    theme: {},
    themeMode: 'normal',
    setThemeMode: () => {},
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
  MatchReasonChips: () => React.createElement('div', { 'data-testid': 'match-reason-chips' }),
  // ADS-C1: faithful Stepper mock mirroring the real component's status /
  // clickable / aria-current logic so adopters can be behaviour-tested.
  Stepper: ({
    steps,
    activeStep,
    completedSteps,
    onStepClick,
    isStepDisabled,
    className,
    'data-testid': testId,
  }: {
    steps: Array<{ id: string; title: string; description?: string; optional?: boolean }>;
    activeStep: number;
    completedSteps?: number[];
    onStepClick?: (index: number) => void;
    isStepDisabled?: (index: number) => boolean;
    className?: string;
    'data-testid'?: string;
  }) => {
    const statusLabel: Record<string, string> = {
      complete: 'Completed',
      current: 'Current',
      upcoming: 'Upcoming',
    };
    const items = steps.map((step, index) => {
      const isComplete = completedSteps ? completedSteps.includes(index) : index < activeStep;
      const status = index === activeStep ? 'current' : isComplete ? 'complete' : 'upcoming';
      const disabled = isStepDisabled ? isStepDisabled(index) : false;
      const clickable = Boolean(onStepClick) && !disabled;
      const ariaCurrent = status === 'current' ? 'step' : undefined;
      const content = [
        React.createElement('span', { key: 'title' }, step.title),
        step.description ? React.createElement('span', { key: 'desc' }, step.description) : null,
        step.optional ? React.createElement('span', { key: 'opt' }, 'Optional') : null,
        React.createElement('span', { key: 'status' }, statusLabel[status]),
      ];
      const inner = clickable
        ? React.createElement(
            'button',
            { type: 'button', 'aria-current': ariaCurrent, onClick: () => onStepClick?.(index) },
            ...content
          )
        : React.createElement('div', { 'aria-current': ariaCurrent }, ...content);
      return React.createElement('li', { key: step.id }, inner);
    });
    const active = steps[activeStep];
    return React.createElement(
      'div',
      { className, 'data-testid': testId },
      React.createElement('ol', null, ...items),
      React.createElement(
        'div',
        { role: 'status', 'aria-live': 'polite' },
        active ? `Step ${activeStep + 1} of ${steps.length}: ${active.title}` : ''
      )
    );
  },
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
  // ADS-C3: FormField label + error scaffolding (mirrors the real component).
  FormField: ({
    label,
    htmlFor,
    required,
    description,
    error,
    children,
  }: {
    label?: string;
    htmlFor?: string;
    required?: boolean;
    description?: string;
    error?: string;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      'div',
      null,
      label && React.createElement('label', { htmlFor }, label, required ? ' *' : null),
      children,
      description && !error ? React.createElement('span', null, description) : null,
      error ? React.createElement('span', { role: 'alert' }, error) : null
    ),
  FormRow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  FormSection: ({
    title,
    description,
    children,
  }: {
    title?: string;
    description?: string;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      'section',
      null,
      title ? React.createElement('h3', null, title) : null,
      description ? React.createElement('p', null, description) : null,
      children
    ),
  // ADS-587: useConfirm / ConfirmDialog mocks so tests can intercept the
  // promise-based confirm flow without rendering the real modal.
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
  ProgressiveImage: ({
    src,
    alt,
    eager,
    placeholder,
    errorFallback,
  }: {
    src: string;
    alt: string;
    eager?: boolean;
    placeholder?: React.ReactNode;
    errorFallback?: React.ReactNode;
    webpSrc?: string;
    rootMargin?: string;
    className?: string;
    draggable?: boolean;
    onLoad?: () => void;
    onError?: () => void;
  }) => {
    const [errored, setErrored] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('img', {
        src,
        alt,
        loading: eager ? 'eager' : 'lazy',
        onLoad: () => setLoaded(true),
        onError: () => setErrored(true),
      }),
      !loaded && !errored ? placeholder : null,
      errored ? errorFallback : null
    );
  },
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
  Logo: ({
    showWordmark,
    darkBg: _darkBg,
    size: _size,
    className,
    ...props
  }: {
    size?: number;
    showWordmark?: boolean;
    darkBg?: boolean;
    className?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      'span',
      { 'aria-label': 'AdoptDontShop', className, ...props },
      showWordmark ? 'AdoptDontShop' : null
    ),
}));
