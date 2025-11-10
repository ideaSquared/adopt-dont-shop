import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { mswHandlers } from './test-utils/msw-handlers';

// Set up MSW server for all tests
const server = setupServer(...mswHandlers);

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any runtime request handlers between tests
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests are done
afterAll(() => {
  server.close();
});

// Mock import.meta for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5000',
        NODE_ENV: 'test',
      },
    },
  },
});

// Mock Image constructor for preloading tests
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 100);
    }
    onload: (() => void) | null = null;
    src: string = '';
  },
});
