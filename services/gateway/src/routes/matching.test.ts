import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MatchingV1,
  type EndSessionResponse,
  type ListSwipeHistoryResponse,
  type RecordSwipeResponse,
  type StartSessionResponse,
  type SwipeActionRecord,
  type SwipeSession,
} from '@adopt-dont-shop/proto';

import type { MatchingClient } from '../grpc-clients/matching-client.js';

import { registerMatchingRoutes } from './matching.js';

function makeClient(): {
  client: MatchingClient;
  startSessionMock: ReturnType<typeof vi.fn>;
  endSessionMock: ReturnType<typeof vi.fn>;
  recordSwipeMock: ReturnType<typeof vi.fn>;
  listSwipeHistoryMock: ReturnType<typeof vi.fn>;
  recommendMock: ReturnType<typeof vi.fn>;
  searchPetsMock: ReturnType<typeof vi.fn>;
} {
  const startSessionMock = vi.fn();
  const endSessionMock = vi.fn();
  const recordSwipeMock = vi.fn();
  const listSwipeHistoryMock = vi.fn();
  const recommendMock = vi.fn();
  const searchPetsMock = vi.fn();
  const client: MatchingClient = {
    startSession: startSessionMock,
    endSession: endSessionMock,
    recordSwipe: recordSwipeMock,
    listSwipeHistory: listSwipeHistoryMock,
    recommend: recommendMock,
    searchPets: searchPetsMock,
    close: vi.fn(),
  };
  return {
    client,
    startSessionMock,
    endSessionMock,
    recordSwipeMock,
    listSwipeHistoryMock,
    recommendMock,
    searchPetsMock,
  };
}

async function makeApp(client: MatchingClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerMatchingRoutes(app, { client });
  return app;
}

const SESSION_FIXTURE: SwipeSession = {
  sessionId: 'sess-1',
  userId: 'usr-1',
  startTime: '2026-06-01T12:00:00.000Z',
  totalSwipes: 0,
  likes: 0,
  passes: 0,
  superLikes: 0,
  filtersJson: '{}',
  deviceType: MatchingV1.DeviceType.DEVICE_TYPE_MOBILE,
  isActive: true,
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-06-01T12:00:00.000Z',
};

const SWIPE_FIXTURE: SwipeActionRecord = {
  swipeActionId: 'swp-1',
  sessionId: 'sess-1',
  petId: 'pet-1',
  userId: 'usr-1',
  action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
  timestamp: '2026-06-01T12:01:00.000Z',
};

const ADOPTER_HEADERS = {
  'x-user-id': 'usr-1',
  'x-user-roles': 'adopter',
  'x-user-permissions': 'pets.read',
};

describe('POST /api/v1/matching/sessions', () => {
  let app: FastifyInstance;
  let startSessionMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    startSessionMock = m.startSessionMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 when StartSession creates a new session', async () => {
    const res: StartSessionResponse = { session: SESSION_FIXTURE, created: true };
    startSessionMock.mockResolvedValue(res);

    const httpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions',
      headers: ADOPTER_HEADERS,
      payload: { filtersJson: '{"species":"dog"}', deviceType: 'mobile' },
    });

    expect(httpRes.statusCode).toBe(201);
    expect(startSessionMock.mock.calls[0][0]).toMatchObject({
      filtersJson: '{"species":"dog"}',
      deviceType: MatchingV1.DeviceType.DEVICE_TYPE_MOBILE,
    });
  });

  it('returns 200 when StartSession returns an existing session (created=false)', async () => {
    startSessionMock.mockResolvedValue({ session: SESSION_FIXTURE, created: false });

    const httpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions',
      headers: ADOPTER_HEADERS,
      payload: {},
    });

    expect(httpRes.statusCode).toBe(200);
  });

  it('threads x-user-* metadata to the gRPC client', async () => {
    startSessionMock.mockResolvedValue({ session: SESSION_FIXTURE, created: true });

    await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions',
      headers: ADOPTER_HEADERS,
      payload: {},
    });

    const metadata = startSessionMock.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
    expect(metadata.get('x-user-permissions')).toEqual(['pets.read']);
  });

  it('accepts SCREAMING proto-form deviceType', async () => {
    startSessionMock.mockResolvedValue({ session: SESSION_FIXTURE, created: true });

    await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions',
      headers: ADOPTER_HEADERS,
      payload: { deviceType: 'DEVICE_TYPE_TABLET' },
    });

    expect(startSessionMock.mock.calls[0][0]).toMatchObject({
      deviceType: MatchingV1.DeviceType.DEVICE_TYPE_TABLET,
    });
  });

  it.each([
    [grpcStatus.INVALID_ARGUMENT, 400],
    [grpcStatus.UNAUTHENTICATED, 401],
    [grpcStatus.PERMISSION_DENIED, 403],
    [grpcStatus.INTERNAL, 500],
  ])('maps gRPC code %i to HTTP %i', async (gCode, httpCode) => {
    startSessionMock.mockRejectedValue({ code: gCode, details: 'oops' });

    const httpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions',
      headers: ADOPTER_HEADERS,
      payload: {},
    });

    expect(httpRes.statusCode).toBe(httpCode);
    expect(httpRes.json()).toMatchObject({ error: 'oops' });
  });
});

describe('POST /api/v1/matching/sessions/:id/end', () => {
  let app: FastifyInstance;
  let endSessionMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    endSessionMock = m.endSessionMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('threads :id as sessionId', async () => {
    const res: EndSessionResponse = { session: { ...SESSION_FIXTURE, isActive: false } };
    endSessionMock.mockResolvedValue(res);

    const httpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions/sess-42/end',
      headers: ADOPTER_HEADERS,
      payload: {},
    });

    expect(httpRes.statusCode).toBe(200);
    expect(endSessionMock.mock.calls[0][0]).toMatchObject({ sessionId: 'sess-42' });
  });
});

describe('POST /api/v1/matching/sessions/:id/swipes', () => {
  let app: FastifyInstance;
  let recordSwipeMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    recordSwipeMock = m.recordSwipeMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('threads body + sessionId, returns 201', async () => {
    const res: RecordSwipeResponse = { action: SWIPE_FIXTURE, session: SESSION_FIXTURE };
    recordSwipeMock.mockResolvedValue(res);

    const httpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions/sess-1/swipes',
      headers: ADOPTER_HEADERS,
      payload: { petId: 'pet-1', action: 'like', responseTime: 1234 },
    });

    expect(httpRes.statusCode).toBe(201);
    expect(recordSwipeMock.mock.calls[0][0]).toMatchObject({
      sessionId: 'sess-1',
      petId: 'pet-1',
      action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
      responseTime: 1234,
    });
  });

  it('coerces unknown action string to UNSPECIFIED (matching service surfaces 400)', async () => {
    recordSwipeMock.mockResolvedValue({ action: SWIPE_FIXTURE, session: SESSION_FIXTURE });

    await app.inject({
      method: 'POST',
      url: '/api/v1/matching/sessions/sess-1/swipes',
      headers: ADOPTER_HEADERS,
      payload: { petId: 'pet-1', action: 'block' },
    });

    expect(recordSwipeMock.mock.calls[0][0]).toMatchObject({
      action: MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED,
    });
  });
});

describe('GET /api/v1/matching/swipes', () => {
  let app: FastifyInstance;
  let listSwipeHistoryMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    listSwipeHistoryMock = m.listSwipeHistoryMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards limit + cursor + action filter as ListSwipeHistory request', async () => {
    const res: ListSwipeHistoryResponse = { actions: [SWIPE_FIXTURE], nextCursor: 'cursor-2' };
    listSwipeHistoryMock.mockResolvedValue(res);

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/matching/swipes?limit=25&cursor=abc&action=super_like',
      headers: ADOPTER_HEADERS,
    });

    expect(httpRes.statusCode).toBe(200);
    expect(listSwipeHistoryMock.mock.calls[0][0]).toMatchObject({
      limit: 25,
      cursor: 'abc',
      actionFilter: MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE,
    });
    expect(httpRes.json()).toMatchObject({ nextCursor: 'cursor-2' });
  });
});

describe('POST /api/v1/discovery/queue (Recommend)', () => {
  let app: FastifyInstance;
  let recommendMock: ReturnType<typeof vi.fn>;
  let startSessionMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    recommendMock = m.recommendMock;
    startSessionMock = m.startSessionMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('opens a session implicitly then returns the discovery-queue envelope', async () => {
    startSessionMock.mockResolvedValueOnce({
      session: SESSION_FIXTURE,
      created: true,
    } satisfies StartSessionResponse);
    recommendMock.mockResolvedValueOnce({
      candidates: [
        {
          petId: 'pet-1',
          name: 'Rex',
          species: 'dog',
          rescueId: 'rsc-1',
          score: 0.9,
        },
      ],
      exhausted: false,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/discovery/queue',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { filters: { species: 'dog' }, limit: 10 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      pets: [{ pet_id: 'pet-1', type: 'dog', score: 0.9 }],
      currentIndex: 0,
      hasMore: true,
      nextBatchSize: 20,
    });
    // StartSession was called with the filters; then Recommend with the session.
    expect(startSessionMock.mock.calls[0][0].filtersJson).toBe('{"species":"dog"}');
    expect(recommendMock.mock.calls[0][0]).toMatchObject({
      sessionId: 'sess-1',
      limit: 10,
      filtersJsonOverride: '{"species":"dog"}',
    });
  });

  it('uses the supplied sessionId without opening a new one', async () => {
    recommendMock.mockResolvedValueOnce({ candidates: [], exhausted: true });
    await app.inject({
      method: 'POST',
      url: '/api/v1/discovery/queue',
      payload: { sessionId: 'sess-9' },
    });
    expect(startSessionMock).not.toHaveBeenCalled();
    expect(recommendMock.mock.calls[0][0].sessionId).toBe('sess-9');
  });
});

describe('POST /api/v1/discovery/pets/more (Recommend, paged)', () => {
  it('rejects when sessionId is missing', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/discovery/pets/more',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(m.recommendMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('forwards the sessionId + limit', async () => {
    const m = makeClient();
    m.recommendMock.mockResolvedValueOnce({
      candidates: [{ petId: 'pet-2', name: 'Sam', species: 'cat', rescueId: 'rsc-1', score: 0.4 }],
      exhausted: false,
    });
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/discovery/pets/more',
        payload: { sessionId: 'sess-1', limit: 5 },
      });
      expect(res.statusCode).toBe(200);
      expect(m.recommendMock.mock.calls[0][0]).toMatchObject({
        sessionId: 'sess-1',
        limit: 5,
      });
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/search/pets (SearchPets)', () => {
  it('forwards q/filters/cursor/limit and returns the view envelope', async () => {
    const m = makeClient();
    m.searchPetsMock.mockResolvedValueOnce({
      results: [{ petId: 'pet-1', name: 'Rex', species: 'dog', rescueId: 'rsc-1', score: 0 }],
      nextCursor: 'cur-2',
    });
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search/pets?q=rex&limit=10&cursor=abc&filters=%7B%22species%22%3A%22dog%22%7D',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { results: Array<Record<string, unknown>>; next_cursor?: string };
      expect(body.next_cursor).toBe('cur-2');
      expect(body.results[0]).toMatchObject({ pet_id: 'pet-1', type: 'dog' });
      // No recommender score on plain search.
      expect('score' in body.results[0]).toBe(false);
      expect(m.searchPetsMock.mock.calls[0][0]).toMatchObject({
        query: 'rex',
        cursor: 'abc',
        limit: 10,
        filtersJson: '{"species":"dog"}',
      });
    } finally {
      await app.close();
    }
  });
});
