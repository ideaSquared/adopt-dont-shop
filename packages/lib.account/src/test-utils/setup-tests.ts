import '@testing-library/jest-dom';
import { vi } from 'vitest';

// JSDOM lacks the pointer-capture and scrolling APIs Radix Select (behind
// lib.components' SelectInput) calls. Mirrors lib.components' setupTests.
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
Element.prototype.scrollIntoView = vi.fn();
