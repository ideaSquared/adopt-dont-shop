// Consumer-driven contract: applications → auth.userProfileChanged (NATS event)
//
// service.applications keeps the applicant's name and email on its
// applications read model and follows changes through the
// auth.userProfileChanged subscriber (src/nats/applicant-updates.ts). The
// subscriber reads userId, firstName, lastName, email and updatedAt (the
// ordering key), and ignores an event without userId, email or a parseable
// updatedAt. This contract pins exactly those fields.
//
// The message is fed to the real applyApplicantProfileChange(), so the
// contract fails if the subscriber would ignore it. Provider verification:
// services/auth/test/contracts/auth-events.provider.test.ts. See ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { asynchronousBodyHandler, MatchersV3, MessageConsumerPact } from '@pact-foundation/pact';

import { applyApplicantProfileChange } from '../../src/nats/applicant-updates.js';

const { like, regex } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → applications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const ISO_8601 = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$';

const pact = new MessageConsumerPact({
  consumer: 'service.applications',
  provider: 'service.auth',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

describe('applications consumer → auth: auth.userProfileChanged', () => {
  it("applies an auth.userProfileChanged event to the applicant's copied name and email", () => {
    return pact
      .given('a user changes their name and email')
      .expectsToReceive('auth.userProfileChanged event')
      .withContent({
        userId: like('usr-001'),
        firstName: like('Alex'),
        lastName: like('Jenkinson'),
        email: like('alex@example.com'),
        updatedAt: regex(ISO_8601, '2026-06-18T10:00:00.000Z'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler(async body => {
          const query = vi.fn().mockResolvedValue({ rows: [] });
          // A query spy stands in for the pool: the effect is the UPDATE it issues.
          await applyApplicantProfileChange({ query } as unknown as Pool, body);

          expect(query).toHaveBeenCalledTimes(1);
          expect(query.mock.calls[0][1]).toEqual([
            'Alex Jenkinson',
            'alex@example.com',
            '2026-06-18T10:00:00.000Z',
            'usr-001',
          ]);
        })
      );
  });
});
