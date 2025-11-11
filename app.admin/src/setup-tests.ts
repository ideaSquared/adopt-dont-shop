import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
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
      if (this.onload) this.onload(new Event('load'));
    }, 100);
  }
  onload: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  src: string = '';
} as any;
