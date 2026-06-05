import { describe, expect, it } from 'vitest';

import { createAuthClient } from './auth-client.js';

describe('createAuthClient', () => {
  it('returns an object exposing validateToken + close', () => {
    const client = createAuthClient({ address: '127.0.0.1:65530' });
    try {
      expect(typeof client.validateToken).toBe('function');
      expect(typeof client.close).toBe('function');
    } finally {
      client.close();
    }
  });
});
