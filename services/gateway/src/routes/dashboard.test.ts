import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationsV1, PetsV1, type Application, type Pet } from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerDashboardRoutes } from './dashboard.js';

// --- Fixtures -------------------------------------------------------

const PET_FIXTURE: Pet = {
  petId: 'pet-1',
  name: 'Rex',
  rescueId: 'rsc-1',
  type: PetsV1.PetType.PET_TYPE_DOG,
  status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
  gender: PetsV1.PetGender.PET_GENDER_MALE,
  size: PetsV1.PetSize.PET_SIZE_LARGE,
  ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
  archived: false,
  featured: false,
  priorityListing: false,
  specialNeeds: false,
  houseTrained: true,
  temperamentJson: '[]',
  tagsJson: '[]',
  extraJson: '{}',
  viewCount: 0,
  favoriteCount: 0,
  applicationCount: 0,
  createdAt: '2026-06-05T12:00:00Z',
  updatedAt: '2026-06-05T12:00:00Z',
};

const APP_FIXTURE: Application = {
  applicationId: 'app-1',
  rescueId: 'rsc-1',
  petId: 'pet-2',
  adopterId: 'usr-adopter',
  status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
  version: 1,
  answersJson: '{}',
  createdAt: '2026-06-04T08:00:00Z',
  updatedAt: '2026-06-04T08:00:00Z',
} as unknown as Application;

const PET_STATS_FIXTURE = {
  total: 22,
  available: 10,
  pending: 3,
  adopted: 7,
  foster: 0,
  medicalHold: 2,
  behavioralHold: 0,
  notAvailable: 0,
  deceased: 0,
  monthlyAdoptions: 4,
  averageDaysToAdoption: 13,
};

const APP_STATS_FIXTURE = {
  total: 15,
  draft: 0,
  submitted: 5,
  underReview: 4,
  homeVisitScheduled: 2,
  homeVisitCompleted: 0,
  approved: 1,
  rejected: 1,
  withdrawn: 1,
  adopted: 1,
};

// --- Mocks ----------------------------------------------------------

function makePetsClient(): PetsClient & {
  getStatsMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
} {
  const getStatsMock = vi.fn();
  const listMock = vi.fn();
  return {
    create: vi.fn(),
    get: vi.fn(),
    list: listMock,
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    getStats: getStatsMock,
    close: vi.fn(),
    getStatsMock,
    listMock,
  };
}

function makeApplicationsClient(): ApplicationsClient & {
  getStatsMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
} {
  const getStatsMock = vi.fn();
  const listMock = vi.fn();
  return {
    startDraft: vi.fn(),
    saveDraftAnswers: vi.fn(),
    submitDraft: vi.fn(),
    startReview: vi.fn(),
    scheduleHomeVisit: vi.fn(),
    completeHomeVisit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    withdraw: vi.fn(),
    markAdopted: vi.fn(),
    get: vi.fn(),
    list: listMock,
    getStats: getStatsMock,
    addDocument: vi.fn(),
    listDocuments: vi.fn(),
    removeDocument: vi.fn(),
    close: vi.fn(),
    getStatsMock,
    listMock,
  } as ApplicationsClient & {
    getStatsMock: ReturnType<typeof vi.fn>;
    listMock: ReturnType<typeof vi.fn>;
  };
}

function makeRescueClient(): RescueClient & {
  listStaffMembersMock: ReturnType<typeof vi.fn>;
} {
  const listStaffMembersMock = vi.fn();
  return {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    verify: vi.fn(),
    inviteStaff: vi.fn(),
    getMyStaffMembership: vi.fn(),
    listStaffMembers: listStaffMembersMock,
    createFosterPlacement: vi.fn(),
    listFosterPlacements: vi.fn(),
    getFosterPlacement: vi.fn(),
    endFosterPlacement: vi.fn(),
    getInvitationByToken: vi.fn(),
    close: vi.fn(),
    listStaffMembersMock,
  } as RescueClient & { listStaffMembersMock: ReturnType<typeof vi.fn> };
}

async function buildApp(
  pets: PetsClient,
  apps: ApplicationsClient,
  rescue: RescueClient
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerDashboardRoutes(app, {
    petsClient: pets,
    applicationsClient: apps,
    rescueClient: rescue,
  });
  return app;
}

// --- GET /api/v1/dashboard/rescue -----------------------------------

describe('GET /api/v1/dashboard/rescue', () => {
  let app: FastifyInstance;
  let pets: ReturnType<typeof makePetsClient>;
  let apps: ReturnType<typeof makeApplicationsClient>;
  let rescue: ReturnType<typeof makeRescueClient>;

  beforeEach(async () => {
    pets = makePetsClient();
    apps = makeApplicationsClient();
    rescue = makeRescueClient();
    app = await buildApp(pets, apps, rescue);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 400 when caller has no rescue scope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/rescue',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { message: string }).message).toMatch(/not associated/i);
  });

  it('composes stats + recent activity in parallel', async () => {
    pets.getStatsMock.mockResolvedValueOnce(PET_STATS_FIXTURE);
    apps.getStatsMock.mockResolvedValueOnce(APP_STATS_FIXTURE);
    pets.listMock.mockResolvedValueOnce({ pets: [PET_FIXTURE] });
    apps.listMock.mockResolvedValueOnce({ applications: [APP_FIXTURE] });
    rescue.listStaffMembersMock.mockResolvedValueOnce({
      staffMembers: [{ staffMemberId: 's-1' }, { staffMemberId: 's-2' }],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/rescue',
      headers: {
        'x-user-id': 'usr-staff',
        'x-user-roles': 'rescue_staff',
        'x-rescue-id': 'rsc-1',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        totalAnimals: number;
        availableForAdoption: number;
        pendingApplications: number;
        recentAdoptions: number;
        totalApplications: number;
        adoptedPets: number;
        staffCount: number;
        averageTimeToAdoption: number;
        recentActivity: Array<{ id: string; type: string; timestamp: string }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.totalAnimals).toBe(22);
    expect(body.data.availableForAdoption).toBe(10);
    expect(body.data.pendingApplications).toBe(5);
    expect(body.data.recentAdoptions).toBe(4);
    expect(body.data.totalApplications).toBe(15);
    expect(body.data.staffCount).toBe(2);
    expect(body.data.averageTimeToAdoption).toBe(13);
    expect(body.data.recentActivity).toHaveLength(2);
    // Newest-first ordering: pet was created 2026-06-05, app 2026-06-04.
    expect(body.data.recentActivity[0].type).toBe('pet_added');
    expect(body.data.recentActivity[1].type).toBe('application_received');
  });

  it('admins can target a different rescue via ?rescueId=', async () => {
    pets.getStatsMock.mockResolvedValueOnce(PET_STATS_FIXTURE);
    apps.getStatsMock.mockResolvedValueOnce(APP_STATS_FIXTURE);
    pets.listMock.mockResolvedValueOnce({ pets: [] });
    apps.listMock.mockResolvedValueOnce({ applications: [] });
    rescue.listStaffMembersMock.mockResolvedValueOnce({ staffMembers: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/rescue?rescueId=rsc-target',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });

    const [petStatsReq] = pets.getStatsMock.mock.calls[0] as [{ rescueIdFilter: string }, Metadata];
    expect(petStatsReq.rescueIdFilter).toBe('rsc-target');
    const [appStatsReq] = apps.getStatsMock.mock.calls[0] as [{ rescueIdFilter: string }, Metadata];
    expect(appStatsReq.rescueIdFilter).toBe('rsc-target');
  });

  it('ignores ?rescueId= for a non-admin caller — scopes to their own rescue', async () => {
    pets.getStatsMock.mockResolvedValueOnce(PET_STATS_FIXTURE);
    apps.getStatsMock.mockResolvedValueOnce(APP_STATS_FIXTURE);
    pets.listMock.mockResolvedValueOnce({ pets: [] });
    apps.listMock.mockResolvedValueOnce({ applications: [] });
    rescue.listStaffMembersMock.mockResolvedValueOnce({ staffMembers: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/rescue?rescueId=rsc-other',
      headers: {
        'x-user-id': 'usr-staff',
        'x-user-roles': 'rescue_staff',
        'x-rescue-id': 'rsc-own',
      },
    });

    const [petStatsReq] = pets.getStatsMock.mock.calls[0] as [{ rescueIdFilter: string }, Metadata];
    expect(petStatsReq.rescueIdFilter).toBe('rsc-own');
    const [appStatsReq] = apps.getStatsMock.mock.calls[0] as [{ rescueIdFilter: string }, Metadata];
    expect(appStatsReq.rescueIdFilter).toBe('rsc-own');
  });

  it('propagates an upstream PERMISSION_DENIED as a 403', async () => {
    pets.getStatsMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'no scope',
    });
    apps.getStatsMock.mockResolvedValueOnce(APP_STATS_FIXTURE);
    pets.listMock.mockResolvedValueOnce({ pets: [] });
    apps.listMock.mockResolvedValueOnce({ applications: [] });
    rescue.listStaffMembersMock.mockResolvedValueOnce({ staffMembers: [] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/rescue',
      headers: { 'x-user-id': 'usr-1', 'x-rescue-id': 'rsc-1' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// --- GET /api/v1/dashboard/activity ---------------------------------

describe('GET /api/v1/dashboard/activity', () => {
  let app: FastifyInstance;
  let pets: ReturnType<typeof makePetsClient>;
  let apps: ReturnType<typeof makeApplicationsClient>;
  let rescue: ReturnType<typeof makeRescueClient>;

  beforeEach(async () => {
    pets = makePetsClient();
    apps = makeApplicationsClient();
    rescue = makeRescueClient();
    app = await buildApp(pets, apps, rescue);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 400 when caller has no rescue scope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/activity',
    });
    expect(res.statusCode).toBe(400);
  });

  it('merges pet + application activities and respects limit', async () => {
    pets.listMock.mockResolvedValueOnce({ pets: [PET_FIXTURE] });
    apps.listMock.mockResolvedValueOnce({ applications: [APP_FIXTURE] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/activity?limit=5',
      headers: { 'x-user-id': 'usr-staff', 'x-rescue-id': 'rsc-1' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: Array<{ type: string; metadata: Record<string, unknown> }>;
    };
    expect(body.data).toHaveLength(2);

    const petActivity = body.data.find(a => a.type === 'pet_added')!;
    const appActivity = body.data.find(a => a.type === 'application_received')!;
    expect(petActivity.metadata.petId).toBe('pet-1');
    expect(appActivity.metadata.applicationId).toBe('app-1');

    // Verify limit was forwarded.
    const [petListReq] = pets.listMock.mock.calls[0] as [{ limit: number }, Metadata];
    expect(petListReq.limit).toBe(5);
  });

  it('clamps an out-of-range limit to the default', async () => {
    pets.listMock.mockResolvedValueOnce({ pets: [] });
    apps.listMock.mockResolvedValueOnce({ applications: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/activity?limit=abc',
      headers: { 'x-user-id': 'usr-staff', 'x-rescue-id': 'rsc-1' },
    });
    const [petListReq] = pets.listMock.mock.calls[0] as [{ limit: number }, Metadata];
    expect(petListReq.limit).toBe(10); // DEFAULT_ACTIVITY_LIMIT
  });

  it('caps an oversized limit at the max (100)', async () => {
    pets.listMock.mockResolvedValueOnce({ pets: [] });
    apps.listMock.mockResolvedValueOnce({ applications: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/activity?limit=500',
      headers: { 'x-user-id': 'usr-staff', 'x-rescue-id': 'rsc-1' },
    });
    const [petListReq] = pets.listMock.mock.calls[0] as [{ limit: number }, Metadata];
    expect(petListReq.limit).toBe(100);
  });
});
