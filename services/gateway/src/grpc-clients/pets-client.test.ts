import { describe, expect, it } from 'vitest';

import { createPetsClient } from './pets-client.js';

describe('createPetsClient', () => {
  it('returns an object exposing the six PetService methods + close', () => {
    const client = createPetsClient({ address: '127.0.0.1:65531' });
    try {
      expect(typeof client.create).toBe('function');
      expect(typeof client.get).toBe('function');
      expect(typeof client.list).toBe('function');
      expect(typeof client.update).toBe('function');
      expect(typeof client.updateStatus).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.close).toBe('function');
    } finally {
      client.close();
    }
  });
});
