// Test setup file for Vitest
// This file is automatically loaded before each test file
import { afterEach, vi, type Mock } from 'vitest';

// Type declarations for global variables
declare global {
  var mockFetch: Mock;
  var mockLocalStorage: {
    getItem: Mock;
    setItem: Mock;
    removeItem: Mock;
    clear: Mock;
    length: number;
    key: Mock;
  };
}

// Mock fetch globally
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock global localStorage (for Node.js environment)
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.localStorage (for jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

// Mock console methods to reduce noise in tests (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };

// Global test utilities available in all tests
(global as any).mockFetch = mockFetch;
(global as any).mockLocalStorage = mockLocalStorage;

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
});

// Export for use in individual test files if needed
export { mockFetch, mockLocalStorage };
