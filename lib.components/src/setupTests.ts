import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill for JSDOM missing methods that Radix UI expects
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  value: vi.fn(),
  writable: true,
});

// Mock ResizeObserver — must use a regular function (not arrow) so it can be called with `new`
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();
