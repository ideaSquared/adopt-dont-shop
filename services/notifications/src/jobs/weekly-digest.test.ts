import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationsV1, PetsV1, type Application, type Pet } from '@adopt-dont-shop/proto';

// createNotification is exercised thoroughly in grpc/handlers.test.ts
// already (permission gate, insert, publish-after-commit). Mocking it
// here keeps this suite focused on the job's OWN orchestration —
// cohort paging, consent filtering, per-user compose/skip, failure
// isolation, and the run summary — rather than re-simulating its
// internal SQL.
const createNotificationMock = vi.fn();
vi.mock('../grpc/handlers.js', () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

import {
  composeWeeklyDigest,
  runWeeklyDigest,
  WEEKLY_DIGEST_ANCHOR_MS,
  WEEKLY_DIGEST_INTERVAL_MS,
  type WeeklyDigestDeps,
} from './weekly-digest.js';

// ADS-1127 grid-drift regression, applied to this job specifically: an
// un-anchored 7-day scheduler job lands on the Unix epoch's weekday
// (Thursday) — see packages/scheduler/src/scheduler.test.ts. The anchor
// must be Monday 09:00 UTC (email_preferences.digest_time's default), and
// the interval must be exactly 7 days so the grid repeats weekly.
describe('scheduler wiring constants', () => {
  it('anchors to Monday 09:00 UTC', () => {
    const anchor = new Date(WEEKLY_DIGEST_ANCHOR_MS);
    expect(anchor.getUTCDay()).toBe(1);
    expect(anchor.getUTCHours()).toBe(9);
    expect(anchor.getUTCMinutes()).toBe(0);
  });

  it('is a 7-day interval', () => {
    expect(WEEKLY_DIGEST_INTERVAL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

// --- Fixtures ------------------------------------------------------

const availablePet = (overrides: Partial<Pet> = {}): Pet => ({
  petId: 'pet-1',
  name: 'Rex',
  type: PetsV1.PetType.PET_TYPE_DOG,
  status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
  gender: PetsV1.PetGender.PET_GENDER_MALE,
  size: PetsV1.PetSize.PET_SIZE_MEDIUM,
  ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
  archived: false,
  featured: false,
  priorityListing: false,
  specialNeeds: false,
  houseTrained: true,
  temperamentJson: '',
  tagsJson: '',
  extraJson: '',
  viewCount: 0,
  favoriteCount: 0,
  applicationCount: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const inProgressApplication = (overrides: Partial<Application> = {}): Application => ({
  applicationId: 'app-1',
  adopterId: 'usr-1',
  petId: 'pet-2',
  rescueId: 'rsc-1',
  status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
  answersJson: '',
  referencesJson: '',
  version: 1,
  submittedAt: '2026-09-10T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-10T00:00:00.000Z',
  ...overrides,
});

// --- composeWeeklyDigest (pure) -------------------------------------

describe('composeWeeklyDigest', () => {
  it('returns null when there are no available favourites and no in-progress applications', () => {
    expect(composeWeeklyDigest({ favorites: [], applications: [] })).toBeNull();
  });

  it('returns null when the only favourites are unavailable and the only applications are terminal', () => {
    const result = composeWeeklyDigest({
      favorites: [availablePet({ status: PetsV1.PetStatus.PET_STATUS_ADOPTED })],
      applications: [
        inProgressApplication({
          status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_APPROVED,
        }),
      ],
    });
    expect(result).toBeNull();
  });

  it('lists available favourites by name in the "new matches" section', () => {
    const result = composeWeeklyDigest({
      favorites: [
        availablePet({ petId: 'p1', name: 'Rex' }),
        availablePet({ petId: 'p2', name: 'Milo' }),
      ],
      applications: [],
    });
    expect(result).not.toBeNull();
    expect(result?.message).toContain('New matches near you');
    expect(result?.message).toContain('Rex');
    expect(result?.message).toContain('Milo');
  });

  it('caps the shown favourites and notes the remainder', () => {
    const favorites = Array.from({ length: 7 }, (_, i) =>
      availablePet({ petId: `p${i}`, name: `Pet${i}` })
    );
    const result = composeWeeklyDigest({ favorites, applications: [] });
    expect(result?.message).toContain('and 2 more');
  });

  it('summarises in-progress applications by status with a UK-formatted earliest submitted date', () => {
    const result = composeWeeklyDigest({
      favorites: [],
      applications: [
        inProgressApplication({
          applicationId: 'a1',
          status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
          submittedAt: '2026-09-14T00:00:00.000Z',
        }),
        inProgressApplication({
          applicationId: 'a2',
          status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW,
          submittedAt: '2026-09-10T00:00:00.000Z',
        }),
      ],
    });
    expect(result?.message).toContain('Still waiting on your shortlist');
    expect(result?.message).toContain('2 applications in progress');
    expect(result?.message).toContain('1 submitted, awaiting review');
    expect(result?.message).toContain('1 under review');
    // Earliest of the two submittedAt dates, DD/MM/YYYY.
    expect(result?.message).toContain('10/09/2026');
  });

  it('excludes draft/withdrawn/decided applications from the in-progress count', () => {
    const result = composeWeeklyDigest({
      favorites: [],
      applications: [
        inProgressApplication({
          status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_REJECTED,
        }),
        inProgressApplication({
          status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_WITHDRAWN,
        }),
        inProgressApplication({
          status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_ADOPTED,
        }),
      ],
    });
    expect(result).toBeNull();
  });

  it('combines both sections when both have content', () => {
    const result = composeWeeklyDigest({
      favorites: [availablePet()],
      applications: [inProgressApplication()],
    });
    expect(result?.message).toContain('New matches near you');
    expect(result?.message).toContain('Still waiting on your shortlist');
  });
});

// --- runWeeklyDigest (orchestration) ---------------------------------

type ConsentFixture = {
  is_email_enabled: boolean;
  global_unsubscribe: boolean;
  is_blacklisted: boolean;
  digest_frequency: string;
};

const consented: ConsentFixture = {
  is_email_enabled: true,
  global_unsubscribe: false,
  is_blacklisted: false,
  digest_frequency: 'weekly',
};

function makeDeps(opts: {
  activeUserIds: string[];
  consentRows?: Array<{ user_id: string } & ConsentFixture>;
  favoritesByUser?: Record<string, Pet[]>;
  applicationsByUser?: Record<string, Application[]>;
  failFor?: Set<string>;
}) {
  const poolQuery = vi.fn(async (sql: string) => {
    if (sql.includes('FROM email_preferences') && sql.includes('ANY(')) {
      return { rows: opts.consentRows ?? [] };
    }
    if (sql.includes('UPDATE email_preferences SET last_digest_sent')) {
      return { rows: [] };
    }
    return { rows: [] };
  });

  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('event_outbox')) {
        return { rows: [] };
      }
      throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
    }),
    release: vi.fn(),
  };
  const pool = {
    query: poolQuery,
    connect: vi.fn().mockResolvedValue(client),
  };

  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };

  const authClient = {
    listUserIdsByCohort: vi.fn().mockResolvedValue({
      userIds: opts.activeUserIds,
      total: opts.activeUserIds.length,
      page: 1,
      totalPages: 1,
    }),
  };
  const petsClient = {
    listFavoritesForUser: vi.fn(async (userId: string) => {
      if (opts.failFor?.has(userId)) {
        throw new Error(`pets fan-out failed for ${userId}`);
      }
      return opts.favoritesByUser?.[userId] ?? [];
    }),
  };
  const applicationsClient = {
    listByUser: vi.fn(async (userId: string) => opts.applicationsByUser?.[userId] ?? []),
  };

  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };

  const deps: WeeklyDigestDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    authClient,
    petsClient,
    applicationsClient,
    logger: logger as never,
  };

  return {
    deps,
    poolQuery,
    client,
    natsPublish,
    authClient,
    petsClient,
    applicationsClient,
    logger,
  };
}

describe('runWeeklyDigest', () => {
  beforeEach(() => {
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue({ notification: undefined });
  });

  it('sends a composed digest only to consented users with content, and updates last_digest_sent', async () => {
    const mocks = makeDeps({
      activeUserIds: ['usr-1', 'usr-2'],
      consentRows: [
        { user_id: 'usr-1', ...consented },
        { user_id: 'usr-2', ...consented },
      ],
      favoritesByUser: { 'usr-1': [availablePet()] },
      applicationsByUser: {},
    });

    const result = await runWeeklyDigest(mocks.deps, new Date('2026-09-21T09:00:00.000Z'));

    expect(result).toEqual({ cohortSize: 2, consented: 2, sent: 1, skippedEmpty: 1, failed: 0 });
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    const [, principal, req] = createNotificationMock.mock.calls[0] as [
      unknown,
      { userId: string },
      { userId: string; channel: unknown; type: unknown },
    ];
    expect(req.userId).toBe('usr-1');
    expect(principal.userId).toBe('svc.notifications');
    const lastDigestUpdate = mocks.poolQuery.mock.calls.find(([sql]) =>
      String(sql).includes('last_digest_sent')
    );
    expect(lastDigestUpdate?.[1]).toEqual(['usr-1', new Date('2026-09-21T09:00:00.000Z')]);
  });

  it('never queries fan-out data for a user excluded by the consent filter', async () => {
    const mocks = makeDeps({
      activeUserIds: ['usr-1', 'usr-unsubscribed'],
      consentRows: [
        { user_id: 'usr-1', ...consented },
        { user_id: 'usr-unsubscribed', ...consented, global_unsubscribe: true },
      ],
      favoritesByUser: { 'usr-1': [availablePet()] },
    });

    await runWeeklyDigest(mocks.deps);

    expect(mocks.petsClient.listFavoritesForUser).toHaveBeenCalledTimes(1);
    expect(mocks.petsClient.listFavoritesForUser).toHaveBeenCalledWith('usr-1');
  });

  it('never sends an empty digest', async () => {
    const mocks = makeDeps({
      activeUserIds: ['usr-1'],
      consentRows: [{ user_id: 'usr-1', ...consented }],
    });

    const result = await runWeeklyDigest(mocks.deps);

    expect(result.sent).toBe(0);
    expect(result.skippedEmpty).toBe(1);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it('isolates a per-recipient failure — one bad fan-out does not abort the run', async () => {
    const mocks = makeDeps({
      activeUserIds: ['usr-bad', 'usr-good'],
      consentRows: [
        { user_id: 'usr-bad', ...consented },
        { user_id: 'usr-good', ...consented },
      ],
      favoritesByUser: { 'usr-good': [availablePet()] },
      failFor: new Set(['usr-bad']),
    });

    const result = await runWeeklyDigest(mocks.deps);

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(1);
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'weekly-digest.recipient_failed',
      expect.objectContaining({ userId: 'usr-bad' })
    );
  });

  it('publishes one notifications.actionTaken summary event when at least one digest sent', async () => {
    const mocks = makeDeps({
      activeUserIds: ['usr-1'],
      consentRows: [{ user_id: 'usr-1', ...consented }],
      favoritesByUser: { 'usr-1': [availablePet()] },
    });

    await runWeeklyDigest(mocks.deps);

    expect(mocks.natsPublish).toHaveBeenCalledTimes(1);
    const [subject] = mocks.natsPublish.mock.calls[0] as [string];
    expect(subject).toBe('notifications.actionTaken');
  });

  it('publishes no summary event when the run sends nothing (no audit noise for a no-op)', async () => {
    const mocks = makeDeps({
      activeUserIds: ['usr-1'],
      consentRows: [{ user_id: 'usr-1', ...consented }],
    });

    await runWeeklyDigest(mocks.deps);

    expect(mocks.natsPublish).not.toHaveBeenCalled();
  });
});
