import { describe, expect, it, vi } from 'vitest';

import { createPetsClient } from './pets-client.js';

const resilienceCalls = vi.hoisted(() => [] as Array<{ circuitBreaker?: unknown }>);

vi.mock('./resilience.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./resilience.js')>();
  return {
    ...actual,
    callWithResilience: vi.fn(async (_fn: unknown, opts: { circuitBreaker?: unknown }) => {
      resilienceCalls.push(opts);
      return {};
    }),
  };
});

describe('createPetsClient circuit breakers', () => {
  it('records pet views behind their own breaker so failures cannot trip reads', async () => {
    resilienceCalls.length = 0;
    const client = createPetsClient({ address: '127.0.0.1:65531' });
    try {
      await client.get({ petId: 'p-1' }, new (await import('@grpc/grpc-js')).Metadata());
      await client.recordPetView({ petId: 'p-1' }, new (await import('@grpc/grpc-js')).Metadata());
      const [readCall, viewCall] = resilienceCalls;
      expect(readCall.circuitBreaker).toBeDefined();
      expect(viewCall.circuitBreaker).toBeDefined();
      expect(viewCall.circuitBreaker).not.toBe(readCall.circuitBreaker);
    } finally {
      client.close();
    }
  });
});

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
