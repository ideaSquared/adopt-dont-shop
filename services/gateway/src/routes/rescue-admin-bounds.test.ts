import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import {
  createBoundsHarness,
  describeBounds,
  makeAnyClient,
  type BoundsCase,
  type BoundsHarness,
} from '../../test/helpers/bounds-cases.js';

import { stubClient } from '../../test/helpers/stub-client.js';

import { registerRescueAdminRoutes } from './rescue-admin.js';

const cases: readonly BoundsCase[] = [
  {
    method: 'PATCH',
    url: '/api/v1/admin/rescues/rsc-1/plan',
    valid: { plan: 'pro' },
    fields: [
      ['plan', 'token'],
      ['planExpiresAt', 'token'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/rescues/rsc-1/send-email',
    valid: { subject: 'Hello', body: 'Welcome' },
    fields: [
      ['templateId', 'token'],
      ['subject', 'name'],
      ['body', 'longText'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/rescues/bulk-update',
    valid: { rescueIds: ['rsc-1'], action: 'approve' },
    fields: [
      ['rescueIds.0', 'token'],
      ['action', 'token'],
      ['reason', 'longText'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/rescues/rsc-1/reject',
    valid: { reason: 'incomplete' },
    fields: [['reason', 'longText']],
  },
  {
    method: 'POST',
    url: '/api/v1/rescues/rsc-1/staff',
    valid: { userId: 'usr-1' },
    fields: [
      ['userId', 'token'],
      ['title', 'name'],
    ],
  },
  {
    method: 'PUT',
    url: '/api/v1/rescues/rsc-1/staff/usr-1',
    valid: { title: 'Coordinator' },
    fields: [['title', 'name']],
  },
  {
    method: 'POST',
    url: '/api/v1/rescues/rsc-1/invitations',
    valid: { email: 'new@rescue.org' },
    fields: [
      ['email', 'email'],
      ['title', 'name'],
    ],
  },
];

describe('rescue-admin mutation body bounds (ENG-1406)', () => {
  let harness: BoundsHarness;

  beforeAll(async () => {
    harness = await createBoundsHarness(app =>
      registerRescueAdminRoutes(app, {
        client: makeAnyClient<RescueClient>(),
        authClient: makeAnyClient<AuthClient>(),
      })
    );
  });

  afterAll(async () => {
    await harness.app.close();
  });

  describeBounds(() => harness, cases);

  describe('DELETE /api/v1/rescues/:rescueId', () => {
    let app: FastifyInstance;
    const deleteRescue = vi.fn();

    beforeAll(async () => {
      deleteRescue.mockResolvedValue({});
      app = Fastify({ logger: false });
      await registerRescueAdminRoutes(app, {
        client: stubClient<RescueClient>({ delete: deleteRescue }),
      });
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      deleteRescue.mockClear();
    });

    const remove = (payload?: Record<string, unknown>) =>
      app.inject({
        method: 'DELETE',
        url: '/api/v1/rescues/rsc-1',
        payload,
      });

    it('deletes without a body', async () => {
      expect((await remove()).statusCode).toBe(200);
      expect(deleteRescue).toHaveBeenCalledTimes(1);
    });

    it('accepts a reason of 10000 characters', async () => {
      expect((await remove({ reason: 'a'.repeat(10_000) })).statusCode).toBe(200);
      expect(deleteRescue).toHaveBeenCalledTimes(1);
    });

    it('rejects a reason over 10000 characters with 400 before deleting', async () => {
      expect((await remove({ reason: 'a'.repeat(10_001) })).statusCode).toBe(400);
      expect(deleteRescue).not.toHaveBeenCalled();
    });

    it('counts an emoji as one character, like the schema bounds', async () => {
      expect((await remove({ reason: '😀'.repeat(10_000) })).statusCode).toBe(200);
      expect((await remove({ reason: '😀'.repeat(10_001) })).statusCode).toBe(400);
      expect(deleteRescue).toHaveBeenCalledTimes(1);
    });
  });
});
