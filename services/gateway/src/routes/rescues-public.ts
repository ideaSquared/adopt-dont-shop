// REST → gRPC translation for /api/v1/rescues/* (PLURAL) — the path
// the SPA actually calls. Stage B finishes the rescue contract:
// response shapes are adapted via rescue-view (snake_case, lowercase
// enum tokens, settings_json unpacked, { success, data, meta }
// envelope).
//
// The pre-existing /api/v1/rescue/* (singular) routes are kept as an
// internal/raw shape; this module is the SPA-facing layer. Both gated
// on cutover.rescue.

import rateLimit from '@fastify/rate-limit';
import { status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  RescueV1,
  type CreateRescueRequest,
  type ListRescuesRequest,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { rescueDataEnvelope, rescueListEnvelope } from './rescue-view.js';
import { buildMetadata } from '../middleware/metadata.js';

export type RescuesPublicRoutesOptions = {
  client: RescueClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.INTERNAL]: 500,
};

const RL_READ = { max: 120, timeWindow: '1 minute' } as const;
const RL_WRITE = { max: 30, timeWindow: '1 minute' } as const;

export const registerRescuesPublicRoutes = async (
  app: FastifyInstance,
  opts: RescuesPublicRoutesOptions
): Promise<void> => {
  const { client } = opts;
  await app.register(rateLimit, { global: false });

  // GET /api/v1/rescues — list with optional status filter, name search,
  // and keyset pagination. lib.rescue.searchRescues / followedRescues
  // hit this with `search=` / cursor params.
  app.get('/api/v1/rescues', { config: { rateLimit: RL_READ } }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const grpcReq = buildListRequest(q);
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      return reply.send(rescueListEnvelope(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/rescues/featured — randomized verified picks. Limit
  // defaults to 8 since the SPA renders a small carousel.
  app.get('/api/v1/rescues/featured', { config: { rateLimit: RL_READ } }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const grpcReq: ListRescuesRequest = {
      limit: q.limit ? Number.parseInt(q.limit, 10) : 8,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
      randomize: true,
    };
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      return reply.send(rescueListEnvelope(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/rescues/search?search=…&status=… — alias for List with
  // name_search wired in.
  app.get('/api/v1/rescues/search', { config: { rateLimit: RL_READ } }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const grpcReq = buildListRequest({ ...q, search: q.search ?? q.q });
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      return reply.send(rescueListEnvelope(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/rescues/nearby?lat&lng&radiusKm=… — geo filter. The
  // service stub returns empty until lat/lng columns land in the schema;
  // the SPA's UX falls back to a "no nearby rescues" empty state
  // cleanly when that happens.
  app.get('/api/v1/rescues/nearby', { config: { rateLimit: RL_READ } }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const lat = q.lat ? Number.parseFloat(q.lat) : undefined;
    const lng = q.lng ? Number.parseFloat(q.lng) : undefined;
    const radius = q.radiusKm ? Number.parseFloat(q.radiusKm) : undefined;
    const grpcReq: ListRescuesRequest = {
      limit: q.limit ? Number.parseInt(q.limit, 10) : 20,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
      latitude: lat,
      longitude: lng,
      radiusKm: radius,
    };
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      return reply.send(rescueListEnvelope(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/rescues/followed — per-user follows. No follows table yet;
  // return an empty page so the SPA's "rescues you follow" surface renders
  // cleanly. A future PR adds a user_rescue_follows table + the join.
  app.get('/api/v1/rescues/followed', { config: { rateLimit: RL_READ } }, async (_req, reply) => {
    return reply.send({
      success: true,
      data: [],
      meta: { hasNext: false },
    });
  });

  // POST /api/v1/rescues/register — alias for Create. The SPA's
  // registration flow posts here.
  app.post('/api/v1/rescues/register', { config: { rateLimit: RL_WRITE } }, async (req, reply) =>
    createRescue(client, req, reply)
  );

  // POST /api/v1/rescues — also Create (for admin tooling that hits the
  // canonical path).
  app.post('/api/v1/rescues', { config: { rateLimit: RL_WRITE } }, async (req, reply) =>
    createRescue(client, req, reply)
  );

  // GET /api/v1/rescues/:id — single rescue read. lib.rescue's
  // getRescueById hits this and parses with RescueAPIResponseSchema.
  app.get<{ Params: { id: string } }>(
    '/api/v1/rescues/:id',
    { config: { rateLimit: RL_READ } },
    async (req, reply) => {
      try {
        const res = await client.get({ rescueId: req.params.id }, buildMetadata(req));
        if (res.rescue === undefined) {
          return reply.code(404).send({ success: false, error: 'rescue not found' });
        }
        return reply.send(rescueDataEnvelope(res.rescue));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

function buildListRequest(q: Record<string, string | undefined>): ListRescuesRequest {
  const status = q.status;
  const statusFilter =
    !status || status === ''
      ? RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED
      : parseStatusFilter(status);
  return {
    cursor: q.cursor,
    limit: q.limit ? Number.parseInt(q.limit, 10) : 0,
    statusFilter,
    nameSearch: q.search,
  };
}

function parseStatusFilter(raw: string): RescueV1.RescueStatus {
  const upper = raw.startsWith('RESCUE_STATUS_') ? raw : `RESCUE_STATUS_${raw.toUpperCase()}`;
  try {
    const v = RescueV1.rescueStatusFromJSON(upper);
    return v < 0 ? RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED : v;
  } catch {
    return RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED;
  }
}

async function createRescue(
  client: RescueClient,
  req: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  // Accept snake_case AND camelCase keys (lib.rescue switched at
  // different times across the codebase).
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = b[k];
      if (typeof v === 'string' && v !== '') {
        return v;
      }
    }
    return undefined;
  };

  const grpcReq: CreateRescueRequest = {
    name: pick('name') ?? '',
    email: pick('email') ?? '',
    phone: pick('phone'),
    address: pick('address') ?? '',
    city: pick('city') ?? '',
    county: pick('county', 'state'),
    postcode: pick('postcode', 'zip_code', 'zipCode') ?? '',
    country: pick('country') ?? 'GB',
    website: pick('website'),
    description: pick('description'),
    mission: pick('mission'),
    companiesHouseNumber: pick('companies_house_number', 'companiesHouseNumber'),
    charityRegistrationNumber: pick('charity_registration_number', 'charityRegistrationNumber'),
    contactPerson: pick('contact_person', 'contactPerson') ?? '',
    contactTitle: pick('contact_title', 'contactTitle'),
    contactEmail: pick('contact_email', 'contactEmail'),
    contactPhone: pick('contact_phone', 'contactPhone'),
    // Note: settings aren't accepted at create-time on the proto; the SPA's
    // register flow can call PATCH /rescues/:id after to set them.
  };
  try {
    const res = await client.create(grpcReq, buildMetadata(req));
    if (res.rescue === undefined) {
      return reply.code(500).send({ success: false, error: 'create returned no rescue' });
    }
    return reply.code(201).send(rescueDataEnvelope(res.rescue));
  } catch (err) {
    return handleGrpcError(err, reply);
  }
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
