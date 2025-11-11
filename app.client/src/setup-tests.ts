import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import 'whatwg-fetch';

// Polyfill TextEncoder/TextDecoder for MSW
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill Response for MSW
global.Response = Response;
global.Request = Request;
global.Headers = Headers;

// MSW setup for API mocking (requires additional Jest ESM configuration)
// TODO: Configure Jest to properly handle MSW ESM exports
// import { setupServer } from 'msw/node';
// import { mswHandlers } from './test-utils/msw-handlers';
//
// const server = setupServer(...mswHandlers);
// beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
// afterEach(() => server.resetHandlers());
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
