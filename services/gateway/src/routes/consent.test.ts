import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerConsentRoutes } from './consent.js';
import { COOKIES_VERSION, PRIVACY_VERSION, TERMS_VERSION } from './legal.js';

type Mocks = {
  client: AuthClient;
  recordConsent: ReturnType<typeof vi.fn>;
  getConsentStatus: ReturnType<typeof vi.fn>;
};

function makeClient(): Mocks {
  const recordConsent = vi.fn();
  const getConsentStatus = vi.fn();
  const client = { recordConsent, getConsentStatus } as unknown as AuthClient;
  return { client, recordConsent, getConsentStatus };
}

async function makeApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerConsentRoutes(app, { client });
  return app;
}

const USER_HEADERS = {
  'x-user-id': 'usr-1',
  'x-user-roles': 'adopter',
  'x-user-permissions': '',
};

describe('POST /api/v1/privacy/consent', () => {
  it('records ToS + Privacy acceptance and returns the count', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.recordConsent.mockResolvedValue({ recorded: 2 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/consent',
        headers: USER_HEADERS,
        payload: { tosAccepted: true, privacyAccepted: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true, recorded: 2 });
      expect(m.recordConsent.mock.calls[0][0].decisions).toEqual([
        { documentType: 'terms', version: TERMS_VERSION },
        { documentType: 'privacy', version: PRIVACY_VERSION },
      ]);
    } finally {
      await app.close();
    }
  });

  it('honours explicit versions and appends a cookies decision', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.recordConsent.mockResolvedValue({ recorded: 3 });

      await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/consent',
        headers: USER_HEADERS,
        payload: {
          tosAccepted: true,
          privacyAccepted: true,
          tosVersion: 'tos-9',
          privacyVersion: 'priv-9',
          cookiesVersion: 'ck-9',
          analyticsConsent: true,
        },
      });

      expect(m.recordConsent.mock.calls[0][0].decisions).toEqual([
        { documentType: 'terms', version: 'tos-9' },
        { documentType: 'privacy', version: 'priv-9' },
        { documentType: 'cookies', version: 'ck-9', analyticsConsent: true },
      ]);
    } finally {
      await app.close();
    }
  });

  it('rejects a body with no acceptances (400) without calling the service', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/consent',
        headers: USER_HEADERS,
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(m.recordConsent).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC UNAUTHENTICATED to 401', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.recordConsent.mockRejectedValue({ code: grpcStatus.UNAUTHENTICATED });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/consent',
        headers: USER_HEADERS,
        payload: { tosAccepted: true },
      });
      expect(res.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/privacy/cookies-consent', () => {
  it('records a cookies-only decision, defaulting the version', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.recordConsent.mockResolvedValue({ recorded: 1 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/cookies-consent',
        headers: USER_HEADERS,
        payload: { analyticsConsent: false },
      });

      expect(res.statusCode).toBe(200);
      expect(m.recordConsent.mock.calls[0][0].decisions).toEqual([
        { documentType: 'cookies', version: COOKIES_VERSION, analyticsConsent: false },
      ]);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/legal/pending-reacceptance', () => {
  it('lists documents whose accepted version is stale or missing', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      // terms accepted an OLD version, privacy accepted the CURRENT version,
      // cookies never accepted.
      m.getConsentStatus.mockResolvedValue({
        records: [
          { documentType: 'terms', version: 'old-terms', acceptedAt: '2025-01-01T00:00:00.000Z' },
          {
            documentType: 'privacy',
            version: PRIVACY_VERSION,
            acceptedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/legal/pending-reacceptance',
        headers: USER_HEADERS,
      });

      expect(res.statusCode).toBe(200);
      const { pending } = res.json();
      const types = pending.map((p: { documentType: string }) => p.documentType);
      expect(types).toEqual(['terms', 'cookies']);
      const terms = pending.find((p: { documentType: string }) => p.documentType === 'terms');
      expect(terms).toMatchObject({
        currentVersion: TERMS_VERSION,
        lastAcceptedVersion: 'old-terms',
        lastAcceptedAt: '2025-01-01T00:00:00.000Z',
      });
      const cookies = pending.find((p: { documentType: string }) => p.documentType === 'cookies');
      expect(cookies).toMatchObject({
        currentVersion: COOKIES_VERSION,
        lastAcceptedVersion: null,
        lastAcceptedAt: null,
      });
    } finally {
      await app.close();
    }
  });

  it('returns an empty list when every document is current', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getConsentStatus.mockResolvedValue({
        records: [
          { documentType: 'terms', version: TERMS_VERSION, acceptedAt: '2026-06-01T00:00:00.000Z' },
          {
            documentType: 'privacy',
            version: PRIVACY_VERSION,
            acceptedAt: '2026-06-01T00:00:00.000Z',
          },
          {
            documentType: 'cookies',
            version: COOKIES_VERSION,
            acceptedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/legal/pending-reacceptance',
        headers: USER_HEADERS,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().pending).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
