import { describe, expect, it } from 'vitest';

import { createRescueClient } from './rescue-client.js';

describe('createRescueClient', () => {
  it('returns an object exposing the six RescueService methods + close', () => {
    const client = createRescueClient({ address: '127.0.0.1:65532' });
    try {
      expect(typeof client.create).toBe('function');
      expect(typeof client.get).toBe('function');
      expect(typeof client.list).toBe('function');
      expect(typeof client.update).toBe('function');
      expect(typeof client.verify).toBe('function');
      expect(typeof client.inviteStaff).toBe('function');
      expect(typeof client.close).toBe('function');
    } finally {
      client.close();
    }
  });
});
