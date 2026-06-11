// Test setup file for Jest
// This file is automatically loaded before each test file

// Type declarations for global variables
declare global {
  // eslint-disable-next-line no-var
  var mockFetch: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line no-var
  var mockLocalStorage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    length: number;
    key: ReturnType<typeof vi.fn>;
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
