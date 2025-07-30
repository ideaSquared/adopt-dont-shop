import '@testing-library/jest-dom';

// Note: MSW setup commented out for now to avoid module resolution issues
// TODO: Set up MSW properly for integration testing
// import { setupServer } from 'msw/node';
// import { mswHandlers } from './test-utils/msw-handlers';

// const server = setupServer(...mswHandlers);

// Start MSW server before all tests
// beforeAll(() => server.listen());

// Reset any runtime request handlers between tests
// afterEach(() => server.resetHandlers());

// Clean up after all tests are done
// afterAll(() => server.close());

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
