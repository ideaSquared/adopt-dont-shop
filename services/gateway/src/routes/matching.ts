// REST → gRPC translation for /api/v1/matching/*.
//
// Phase 9.5 cutover. Same shape as routes/audit.ts (#917) /
// routes/rescue.ts / routes/auth.ts — Fastify plugin registers
// BEFORE the strangler-fig http-proxy catch-all, so first-
// registered-wins prefix routing picks it for /api/v1/matching/*
// before the catch-all sees them.
//
// Route map:
//
//   POST /api/v1/matching/sessions                        → StartSession
//   POST /api/v1/matching/sessions/:id/end                → EndSession
//   POST /api/v1/matching/sessions/:id/swipes             → RecordSwipe
//   GET  /api/v1/matching/swipes                          → ListSwipeHistory
//
// Recommend + SearchPets — wired via the frontend lib.discovery /
// lib.search contracts (response shapes adapted via matching-view.ts):
//
//   POST /api/v1/discovery/queue                          → Recommend
//   POST /api/v1/discovery/pets/more                      → Recommend (page)
//   GET  /api/v1/search/pets                              → SearchPets
//
// Authz: PETS_VIEW (matching is a pet-browsing surface). The Phase
// 2.5 authenticate middleware stamps x-user-* metadata; the matching
// handlers re-check the permission as defence-in-depth.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  MatchingV1,
  type EndSessionRequest,
  type GetTopPicksRequest,
  type ListSwipeHistoryRequest,
  type RecommendRequest,
  type RecordSwipeRequest,
  type SearchPetsRequest,
  type StartSessionRequest,
} from '@adopt-dont-shop/proto';

import type { MatchingClient } from '../grpc-clients/matching-client.js';

import { recommendToQueue, searchToView, topPicksToView } from './matching-view.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type MatchingRoutesOptions = {
  client: MatchingClient;
};

// Adds UNIMPLEMENTED → 501 for the Recommend / SearchPets stubs.

// Per-route rate limits. Swipes are the chatty path so they get a
// higher ceiling; sessions are bookended (~2 per browsing session)
// so the lower ceiling is fine. History is a paginated read.
const MATCHING_RATE_LIMITS = {
  startSession: { max: 30, timeWindow: '1 minute' },
  endSession: { max: 30, timeWindow: '1 minute' },
  recordSwipe: { max: 240, timeWindow: '1 minute' },
  listSwipeHistory: { max: 60, timeWindow: '1 minute' },
  // Discovery + search are the chatty browse paths.
  recommend: { max: 120, timeWindow: '1 minute' },
  search: { max: 120, timeWindow: '1 minute' },
  // Top picks is a curated read the SPA loads on the home + picks pages.
  topPicks: { max: 60, timeWindow: '1 minute' },
} as const;

type StartSessionBody = {
  filtersJson?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
};

type RecordSwipeBody = {
  petId?: string;
  action?: string;
  responseTime?: number;
  deviceType?: string;
};

export const registerMatchingRoutes = async (
  app: FastifyInstance,
  opts: MatchingRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  app.post(
    '/api/v1/matching/sessions',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.startSession },
      schema: {
        tags: ['matching'],
        summary: 'Start a new matching session',
        body: {
          type: 'object',
          properties: {
            filtersJson: { type: 'string' },
            deviceType: { type: 'string' },
            userAgent: { type: 'string' },
            ipAddress: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as StartSessionBody;
      const grpcReq: StartSessionRequest = {
        filtersJson: body.filtersJson ?? '',
        deviceType: parseDeviceType(body.deviceType),
        userAgent: body.userAgent,
        ipAddress: body.ipAddress,
      };
      try {
        const res = await client.startSession(grpcReq, buildMetadata(req));
        return reply
          .code(res.created ? 201 : 200)
          .send(MatchingV1.StartSessionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/matching/sessions/:id/end',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.endSession },
      schema: {
        tags: ['matching'],
        summary: 'End a matching session',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const grpcReq: EndSessionRequest = { sessionId: req.params.id };
      try {
        const res = await client.endSession(grpcReq, buildMetadata(req));
        return reply.send(MatchingV1.EndSessionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/matching/sessions/:id/swipes',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.recordSwipe },
      schema: {
        tags: ['matching'],
        summary: 'Record a swipe in a matching session',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: {
            petId: { type: 'string' },
            action: { type: 'string' },
            responseTime: { type: 'number' },
            deviceType: { type: 'string' },
          },
        },
        response: {
          201: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as RecordSwipeBody;
      const grpcReq: RecordSwipeRequest = {
        sessionId: req.params.id,
        petId: body.petId ?? '',
        action: parseSwipeAction(body.action),
        responseTime: body.responseTime,
        deviceType: body.deviceType,
      };
      try {
        const res = await client.recordSwipe(grpcReq, buildMetadata(req));
        return reply.code(201).send(MatchingV1.RecordSwipeResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/discovery/swipe/action — SPA-facing alias for
  // RecordSwipe used by lib.discovery. Body carries sessionId rather
  // than the URL path. Returns 200 + a monolith-shaped envelope
  // ({ success, message }) so the SPA doesn't notice the cutover.
  app.post(
    '/api/v1/discovery/swipe/action',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.recordSwipe },
      schema: {
        tags: ['discovery'],
        summary: 'Record a swipe action (SPA alias)',
        body: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            petId: { type: 'string' },
            action: { type: 'string' },
            responseTime: { type: 'number' },
            deviceType: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, message: { type: 'string' } },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as RecordSwipeBody & { sessionId?: string };
      if (!body.sessionId) {
        return reply.code(400).send({ error: 'sessionId is required' });
      }
      const grpcReq: RecordSwipeRequest = {
        sessionId: body.sessionId,
        petId: body.petId ?? '',
        action: parseSwipeAction(body.action),
        responseTime: body.responseTime,
        deviceType: body.deviceType,
      };
      try {
        await client.recordSwipe(grpcReq, buildMetadata(req));
        return reply.send({
          success: true,
          message: 'Swipe action recorded successfully',
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/matching/swipes',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.listSwipeHistory },
      schema: {
        tags: ['matching'],
        summary: 'List swipe history for the calling user',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            action: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: ListSwipeHistoryRequest = {
        cursor: query.cursor,
        limit: pagination.limit,
        actionFilter: parseSwipeAction(query.action),
      };
      try {
        const res = await client.listSwipeHistory(grpcReq, buildMetadata(req));
        return reply.send(MatchingV1.ListSwipeHistoryResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/discovery/queue — initial recommendations. Body matches
  // lib.discovery.getDiscoveryQueue: { filters, userId?, limit? }. We
  // need a sessionId for Recommend; if the SPA doesn't pass one we
  // start a session implicitly using the filters as the session filters.
  app.post(
    '/api/v1/discovery/queue',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.recommend },
      schema: {
        tags: ['discovery'],
        summary: 'Get initial pet recommendations',
        body: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            filters: { type: 'object', additionalProperties: true },
            limit: { type: 'integer' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as DiscoveryQueueBody;
      const filtersJson = body.filters !== undefined ? JSON.stringify(body.filters) : '';
      try {
        const sessionId = body.sessionId ?? (await openSession(client, req, filtersJson));
        const grpcReq: RecommendRequest = {
          sessionId,
          limit: clampLimit(body.limit),
          filtersJsonOverride: filtersJson !== '' ? filtersJson : undefined,
        };
        const res = await client.recommend(grpcReq, buildMetadata(req));
        return reply.send(recommendToQueue(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/discovery/pets/more — page of more recommendations for
  // an active session.
  app.post(
    '/api/v1/discovery/pets/more',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.recommend },
      schema: {
        tags: ['discovery'],
        summary: 'Get more pet recommendations for an active session',
        body: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            filters: { type: 'object', additionalProperties: true },
            limit: { type: 'integer' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as DiscoveryQueueBody;
      if (body.sessionId === undefined || body.sessionId === '') {
        return reply.code(400).send({ error: 'sessionId is required' });
      }
      const grpcReq: RecommendRequest = {
        sessionId: body.sessionId,
        limit: clampLimit(body.limit),
        filtersJsonOverride: body.filters !== undefined ? JSON.stringify(body.filters) : undefined,
      };
      try {
        const res = await client.recommend(grpcReq, buildMetadata(req));
        return reply.send(recommendToQueue(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/search/pets — lib.search free-text + filters search.
  app.get(
    '/api/v1/search/pets',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.search },
      schema: {
        tags: ['discovery'],
        summary: 'Search for pets by query and filters',
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            query: { type: 'string' },
            filters: { type: 'string' },
            cursor: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: SearchPetsRequest = {
        query: query.q ?? query.query,
        filtersJson: query.filters,
        cursor: query.cursor,
        limit: pagination.limit,
      };
      try {
        const res = await client.searchPets(grpcReq, buildMetadata(req));
        return reply.send(searchToView(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- Match profile -----------------------------------------------
  // GET /api/v1/match/profile — read the adopter's preferences.
  app.get(
    '/api/v1/match/profile',
    {
      schema: {
        tags: ['matching'],
        summary: 'Get the adopter match profile',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getMatchProfile({}, buildMetadata(req));
        return reply.send({ success: true, data: matchProfileToView(res.profile) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /api/v1/match/profile — upsert. The SPA sends snake_case
  // preference fields; map each to the proto's set_* + *_json pair.
  app.put(
    '/api/v1/match/profile',
    {
      schema: {
        tags: ['matching'],
        summary: 'Upsert the adopter match profile',
        body: { type: 'object', additionalProperties: true },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      try {
        const grpcReq = buildUpsertRequest(body);
        const res = await client.upsertMatchProfile(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: matchProfileToView(res.profile) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- Top picks ---------------------------------------------------
  // GET /api/v1/match/top-picks?limit=N — a short, personalised picks
  // list scored against the adopter's stored match profile. Returns the
  // SPA's MatchTopPick[] under a { success, data } envelope.
  app.get(
    '/api/v1/match/top-picks',
    {
      config: { rateLimit: MATCHING_RATE_LIMITS.topPicks },
      schema: {
        tags: ['matching'],
        summary: 'Get personalised top pet picks for the adopter',
        querystring: { type: 'object', properties: { limit: { type: 'string' } } },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const grpcReq: GetTopPicksRequest = { limit: parseTopPicksLimit(query.limit) };
      try {
        const res = await client.getTopPicks(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: topPicksToView(res) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- Swipe statistics --------------------------------------------
  // GET /api/v1/discovery/swipe/stats/:userId
  app.get<{ Params: { userId: string } }>(
    '/api/v1/discovery/swipe/stats/:userId',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Get swipe statistics for a user',
        params: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getUserSwipeStats(
          { userId: req.params.userId },
          buildMetadata(req)
        );
        return reply.send({
          success: true,
          message: 'Swipe statistics retrieved successfully',
          data: res.stats,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/discovery/swipe/session/:sessionId
  app.get<{ Params: { sessionId: string } }>(
    '/api/v1/discovery/swipe/session/:sessionId',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Get statistics for a swipe session',
        params: {
          type: 'object',
          properties: { sessionId: { type: 'string' } },
          required: ['sessionId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getSessionStats(
          { sessionId: req.params.sessionId },
          buildMetadata(req)
        );
        return reply.send({
          success: true,
          message: 'Session statistics retrieved successfully',
          data: res.stats,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Match profile view + request helpers ----------------------------

// Reshape the proto MatchProfile (JSON-stringified blobs) back into the
// monolith's JSON object shape so the SPA's profile form binds without
// change.
function matchProfileToView(
  profile: MatchingV1.MatchProfile | undefined
): Record<string, unknown> | undefined {
  if (!profile) {
    return undefined;
  }
  const parseOrNull = (s: string): unknown => (s === '' ? null : safeJson(s));
  return {
    user_id: profile.userId,
    preferred_types: parseOrNull(profile.preferredTypesJson),
    preferred_sizes: parseOrNull(profile.preferredSizesJson),
    preferred_age_groups: parseOrNull(profile.preferredAgeGroupsJson),
    preferred_energy: parseOrNull(profile.preferredEnergyJson),
    preferred_temperament: parseOrNull(profile.preferredTemperamentJson),
    lifestyle: safeJson(profile.lifestyleJson) ?? {},
    max_distance_km: profile.maxDistanceKm ?? null,
    open_to_special_needs: profile.openToSpecialNeeds,
    notify_new_matches: profile.notifyNewMatches,
    min_notification_score: profile.minNotificationScore,
    last_notified_at: profile.lastNotifiedAt ?? null,
    inferred_prefs: safeJson(profile.inferredPrefsJson) ?? {},
    prefs_updated_at: profile.prefsUpdatedAt ?? null,
    allergies: profile.allergies ?? null,
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Map the SPA's snake_case body to the proto's set_* + *_json pairs.
// A field present in the body → set_*=true + its JSON-stringified value.
function buildUpsertRequest(body: Record<string, unknown>): MatchingV1.UpsertMatchProfileRequest {
  const has = (k: string): boolean => Object.prototype.hasOwnProperty.call(body, k);
  const jsonField = (k: string): string => (has(k) ? JSON.stringify(body[k]) : '');

  return {
    preferredTypesJson: jsonField('preferred_types'),
    setPreferredTypes: has('preferred_types'),
    preferredSizesJson: jsonField('preferred_sizes'),
    setPreferredSizes: has('preferred_sizes'),
    preferredAgeGroupsJson: jsonField('preferred_age_groups'),
    setPreferredAgeGroups: has('preferred_age_groups'),
    preferredEnergyJson: jsonField('preferred_energy'),
    setPreferredEnergy: has('preferred_energy'),
    preferredTemperamentJson: jsonField('preferred_temperament'),
    setPreferredTemperament: has('preferred_temperament'),
    lifestyleJson: jsonField('lifestyle'),
    setLifestyle: has('lifestyle'),
    maxDistanceKm: has('max_distance_km') ? Number(body.max_distance_km) : undefined,
    openToSpecialNeeds: has('open_to_special_needs')
      ? Boolean(body.open_to_special_needs)
      : undefined,
    notifyNewMatches: has('notify_new_matches') ? Boolean(body.notify_new_matches) : undefined,
    minNotificationScore: has('min_notification_score')
      ? Number(body.min_notification_score)
      : undefined,
    allergies: has('allergies') ? (body.allergies as string | undefined) : undefined,
    setAllergies: has('allergies'),
  };
}

type DiscoveryQueueBody = {
  sessionId?: string;
  filters?: Record<string, unknown>;
  userId?: string;
  limit?: number;
};

function clampLimit(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) {
    return 20;
  }
  return Math.min(Math.max(Math.trunc(raw), 1), 100);
}

// Top picks is a short curated list: default 10, capped at 50. An absent
// or unparseable query param falls back to the default. The matching
// service re-clamps with the same bounds as defence-in-depth.
function parseTopPicksLimit(raw: string | undefined): number {
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }
  return Math.min(parsed, 50);
}

// Implicit-session helper: when the SPA doesn't carry a sessionId on
// /discovery/queue, mint one via StartSession (web device by default).
async function openSession(
  client: MatchingClient,
  req: FastifyRequest,
  filtersJson: string
): Promise<string> {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const ua = typeof headers['user-agent'] === 'string' ? headers['user-agent'] : undefined;
  const res = await client.startSession(
    {
      filtersJson,
      // The User-Agent is the SPA in a browser; DESKTOP is the closest
      // bucket the proto offers (no DEVICE_TYPE_WEB exists). Caller can
      // override by calling /matching/sessions explicitly with `deviceType`.
      deviceType: MatchingV1.DeviceType.DEVICE_TYPE_DESKTOP,
      userAgent: ua,
      ipAddress: req.ip,
    },
    buildMetadata(req)
  );
  return res.session?.sessionId ?? '';
}

// --- Helpers ---------------------------------------------------------

// parseSwipeAction accepts DB form ('like' / 'pass' / 'super_like'
// / 'info') AND SCREAMING proto form ('SWIPE_ACTION_LIKE'). Unknown
// coerces to UNSPECIFIED so the matching service's INVALID_ARGUMENT
// guard produces a clean 400.
function parseSwipeAction(raw: string | undefined): MatchingV1.SwipeAction {
  if (!raw) {
    return MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED;
  }
  const upper = `SWIPE_ACTION_${raw.toUpperCase()}`;
  const candidate = Object.values(MatchingV1.SwipeAction).includes(upper as never) ? upper : raw;
  const out = MatchingV1.swipeActionFromJSON(candidate);
  return out === MatchingV1.SwipeAction.UNRECOGNIZED
    ? MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED
    : out;
}

// Same shape for the device type enum.
function parseDeviceType(raw: string | undefined): MatchingV1.DeviceType {
  if (!raw) {
    return MatchingV1.DeviceType.DEVICE_TYPE_UNSPECIFIED;
  }
  const upper = `DEVICE_TYPE_${raw.toUpperCase()}`;
  const candidate = Object.values(MatchingV1.DeviceType).includes(upper as never) ? upper : raw;
  const out = MatchingV1.deviceTypeFromJSON(candidate);
  return out === MatchingV1.DeviceType.UNRECOGNIZED
    ? MatchingV1.DeviceType.DEVICE_TYPE_UNSPECIFIED
    : out;
}
