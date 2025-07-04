import '@testing-library/jest-dom';

// Polyfill for JSDOM missing methods that Radix UI expects
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  value: jest.fn(),
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();
