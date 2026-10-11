import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import { createAuthClient } from './auth-client.js';
import { getOrCreateCircuitBreaker } from './resilience.js';

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

  it('keeps applicant-profile failures off the breaker that guards sign-in', async () => {
    // Applicant lookups fail when service.applications is down. They must not
    // open the circuit that ValidateToken / Login share.
    const client = createAuthClient({ address: '127.0.0.1:65530' });
    try {
      for (let i = 0; i < 6; i++) {
        await client
          .getApplicantProfile({ applicationId: 'app-1', userId: 'usr-1' }, new Metadata())
          .catch(() => undefined);
      }
      expect(getOrCreateCircuitBreaker('service.auth').isOpen()).toBe(false);
    } finally {
      client.close();
    }
  });
});
