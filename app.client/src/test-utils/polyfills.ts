/**
 * Polyfills for Jest + MSW v2
 * These need to be loaded before MSW to ensure global APIs are available
 */

import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream } from 'stream/web';
import 'whatwg-fetch';

// Add TextEncoder/TextDecoder to global scope
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Add Stream APIs to global scope
global.ReadableStream = ReadableStream as typeof global.ReadableStream;
global.TransformStream = TransformStream as typeof global.TransformStream;

// Mock BroadcastChannel for MSW WebSocket support
class BroadcastChannelMock extends EventTarget {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  postMessage(_message: unknown) {
    // No-op in test environment
  }

  close() {
    // No-op in test environment
  }
}

global.BroadcastChannel = BroadcastChannelMock as typeof global.BroadcastChannel;

// Mock import.meta for Vite environment variables
(global as unknown as { import: { meta: { env: Record<string, string> } } }).import = {
  meta: {
    env: {
      VITE_API_BASE_URL: 'http://localhost:5000',
      NODE_ENV: 'test',
      MODE: 'test',
    },
  },
};
