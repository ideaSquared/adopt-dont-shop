// Jest polyfills
import crypto from 'crypto';

// Setup crypto polyfill for test environment
Object.assign(global, {
  crypto: {
    createHash: algorithm => crypto.createHash(algorithm),
    randomBytes: size => crypto.randomBytes(size),
  },
});
