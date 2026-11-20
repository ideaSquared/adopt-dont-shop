// Real-Postgres coverage for UpdateReferenceCheck.
//
// reference-check-handlers.test.ts uses a mock pool, which can't catch a
// type error Postgres raises: the status parameter must be cast to the
// reference_check_status enum, or the upsert is rejected outright.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  APPLICATIONS_CREATE,
  APPLICATIONS_PROCESS,
  APPLICATIONS_UPDATE,
  type RescueId,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import type { HandlerDeps } from './adapter.js';
import { makeStartDraft, submitDraft } from './handlers.js';
import type { PetsClient } from './pets-client.js';
import { updateReferenceCheck } from './reference-check-handlers.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const DB_OPTIONS = {
  schemaPrefix: 'applications',
  migrationsDir: MIGRATIONS_DIR,
  registerTsxLoader: true,
} as const;

const RESCUE_ID = randomUUID();

// randomUUID() and RESCUE_ID are plain strings; UserId/RescueId are branded
// strings with no runtime representation, so casts are the only way to build them.
const adopter = testPrincipal({
  userId: randomUUID() as UserId,
  roles: ['adopter'],
  permissions: [APPLICATIONS_CREATE, APPLICATIONS_UPDATE],
});
const rescueStaff = testPrincipal({
  userId: randomUUID() as UserId,
  roles: ['rescue_staff'],
  rescueId: RESCUE_ID as RescueId,
  permissions: [APPLICATIONS_PROCESS],
});

// Only getPet is used by StartDraft; the cast is for the unused gRPC surface.
const petsClient = { getPet: vi.fn().mockResolvedValue({ pet: { rescueId: RESCUE_ID } }) };
const startDraft = makeStartDraft(petsClient as unknown as PetsClient);

describe.skipIf(!process.env.DATABASE_URL)('updateReferenceCheck (real Postgres)', () => {
  it('creates a reference check, then updates its status', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const draft = await startDraft(deps, adopter, {
        adopterId: adopter.userId,
        petId: randomUUID(),
      });
      const applicationId = draft.application?.applicationId ?? '';
      await submitDraft(deps, adopter, {
        applicationId,
        expectedVersion: draft.application?.version ?? 0,
      });

      const created = await updateReferenceCheck(deps, rescueStaff, {
        applicationId,
        referenceId: 'ref-1',
      });
      const updated = await updateReferenceCheck(deps, rescueStaff, {
        applicationId,
        referenceId: 'ref-1',
        status: 'contacted',
      });

      expect(created.reference?.status).toBe('pending');
      expect(updated.reference?.status).toBe('contacted');
    });
  });
});
