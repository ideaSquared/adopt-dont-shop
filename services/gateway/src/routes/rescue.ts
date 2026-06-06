// REST → gRPC translation for /api/rescue/*.
//
// Phase 4.5 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/rescue/* requests before the
// catch-all sees them. Same shape as routes/pets.ts / routes/auth.ts.
//
// Route map (mirrors the monolith's existing /api/rescue/* surface):
//
//   GET    /api/rescue                    → RescueService.List
//   GET    /api/rescue/:id                → RescueService.Get
//   POST   /api/rescue                    → RescueService.Create
//   PATCH  /api/rescue/:id                → RescueService.Update
//   POST   /api/rescue/:id/verify         → RescueService.Verify
//   POST   /api/rescue/:id/invitations    → RescueService.InviteStaff
//
// The Phase 2.5 authenticate middleware already populates x-user-*
// metadata; every RescueService RPC requires a principal.

import rateLimit from '@fastify/rate-limit';
import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  RescueV1,
  type CreateRescueRequest,
  type InviteStaffRequest,
  type ListRescuesRequest,
  type UpdateRescueRequest,
  type VerifyRescueRequest,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

export type RescueRoutesOptions = {
  client: RescueClient;
};

// Same gRPC-status → HTTP-status table the other routes use.
const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

// Per-route rate limits. Reads are public-ish (adopters browse rescues
// + pet listings render rescue details); writes / status transitions
// are admin/staff only.
const RESCUE_RATE_LIMITS = {
  list: { max: 60, timeWindow: '1 minute' },
  get: { max: 120, timeWindow: '1 minute' },
  create: { max: 10, timeWindow: '1 minute' },
  update: { max: 30, timeWindow: '1 minute' },
  verify: { max: 30, timeWindow: '1 minute' },
  inviteStaff: { max: 30, timeWindow: '1 minute' },
} as const;

type CreateRescueBody = Partial<CreateRescueRequest>;
type UpdateRescueBody = Partial<Omit<UpdateRescueRequest, 'rescueId'>>;
type VerifyBody = {
  toStatus?: string;
  verificationSource?: string;
  failureReason?: string;
};
type InviteStaffBody = {
  email?: string;
  title?: string;
  expiresInSeconds?: number;
};

export const registerRescueRoutes = async (
  app: FastifyInstance,
  opts: RescueRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  app.get('/api/rescue', { config: { rateLimit: RESCUE_RATE_LIMITS.list } }, async (req, reply) => {
    const query = req.query as Record<string, string | undefined>;
    const grpcReq: ListRescuesRequest = {
      cursor: query.cursor,
      limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
      statusFilter: parseStatus(query.status),
    };
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      return reply.send(RescueV1.ListRescuesResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    '/api/rescue/:id',
    { config: { rateLimit: RESCUE_RATE_LIMITS.get } },
    async (req, reply) => {
      try {
        const res = await client.get({ rescueId: req.params.id }, buildMetadata(req));
        return reply.send(RescueV1.GetRescueResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/rescue',
    { config: { rateLimit: RESCUE_RATE_LIMITS.create } },
    async (req, reply) => {
      const body = (req.body ?? {}) as CreateRescueBody;
      const grpcReq: CreateRescueRequest = {
        name: body.name ?? '',
        email: body.email ?? '',
        phone: body.phone,
        address: body.address ?? '',
        city: body.city ?? '',
        county: body.county,
        postcode: body.postcode ?? '',
        country: body.country,
        website: body.website,
        description: body.description,
        mission: body.mission,
        companiesHouseNumber: body.companiesHouseNumber,
        charityRegistrationNumber: body.charityRegistrationNumber,
        contactPerson: body.contactPerson ?? '',
        contactTitle: body.contactTitle,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
      };
      try {
        const res = await client.create(grpcReq, buildMetadata(req));
        return reply.code(201).send(RescueV1.CreateRescueResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/api/rescue/:id',
    { config: { rateLimit: RESCUE_RATE_LIMITS.update } },
    async (req, reply) => {
      const body = (req.body ?? {}) as UpdateRescueBody;
      const grpcReq: UpdateRescueRequest = { rescueId: req.params.id, ...body };
      try {
        const res = await client.update(grpcReq, buildMetadata(req));
        return reply.send(RescueV1.UpdateRescueResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/rescue/:id/verify',
    { config: { rateLimit: RESCUE_RATE_LIMITS.verify } },
    async (req, reply) => {
      const body = (req.body ?? {}) as VerifyBody;
      const grpcReq: VerifyRescueRequest = {
        rescueId: req.params.id,
        toStatus: parseStatus(body.toStatus),
        verificationSource: parseVerificationSource(body.verificationSource),
        failureReason: body.failureReason,
      };
      try {
        const res = await client.verify(grpcReq, buildMetadata(req));
        return reply.send(RescueV1.VerifyRescueResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/rescue/:id/invitations',
    { config: { rateLimit: RESCUE_RATE_LIMITS.inviteStaff } },
    async (req, reply) => {
      const body = (req.body ?? {}) as InviteStaffBody;
      const grpcReq: InviteStaffRequest = {
        rescueId: req.params.id,
        email: body.email ?? '',
        title: body.title,
        expiresInSeconds: body.expiresInSeconds,
      };
      try {
        const res = await client.inviteStaff(grpcReq, buildMetadata(req));
        return reply.code(201).send(RescueV1.InviteStaffResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

function buildMetadata(req: FastifyRequest): Metadata {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-rescue-id']) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}

// parseStatus accepts the canonical DB string ('verified', 'pending')
// AND the SCREAMING proto form ('RESCUE_STATUS_VERIFIED'). Unknown
// coerces to UNSPECIFIED so the service's own INVALID_ARGUMENT guard
// produces a clean 400.
function parseStatus(raw: string | undefined): RescueV1.RescueStatus {
  if (!raw) {
    return RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED;
  }
  const upper = `RESCUE_STATUS_${raw.toUpperCase()}`;
  const candidate = Object.values(RescueV1.RescueStatus).includes(upper as never) ? upper : raw;
  const out = RescueV1.rescueStatusFromJSON(candidate);
  return out === RescueV1.RescueStatus.UNRECOGNIZED
    ? RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED
    : out;
}

function parseVerificationSource(
  raw: string | undefined
): RescueV1.RescueVerificationSource | undefined {
  if (!raw) {
    return undefined;
  }
  const upper = `RESCUE_VERIFICATION_SOURCE_${raw.toUpperCase()}`;
  const candidate = Object.values(RescueV1.RescueVerificationSource).includes(upper as never)
    ? upper
    : raw;
  const out = RescueV1.rescueVerificationSourceFromJSON(candidate);
  return out === RescueV1.RescueVerificationSource.UNRECOGNIZED
    ? RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_UNSPECIFIED
    : out;
}
