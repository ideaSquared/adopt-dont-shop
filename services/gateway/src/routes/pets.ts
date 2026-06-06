// REST → gRPC translation for /api/v1/pets/*.
//
// Phase 3.5 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/v1/pets/* requests before the
// catch-all sees them. Same shape as routes/auth.ts.
//
// Route map (mirrors the surface the SPA + lib.pets React contexts
// already use):
//
//   GET    /api/v1/pets             → PetService.List
//   GET    /api/v1/pets/:id         → PetService.Get
//   POST   /api/v1/pets             → PetService.Create
//   PATCH  /api/v1/pets/:id         → PetService.Update
//   POST   /api/v1/pets/:id/status  → PetService.UpdateStatus
//   DELETE /api/v1/pets/:id         → PetService.Delete
//
// The authenticate middleware (Phase 2.5) already populates the
// x-user-* metadata headers — every PetService RPC requires a
// principal so we never pass anonymous traffic through.

import rateLimit from '@fastify/rate-limit';
import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  PetsV1,
  type CreatePetRequest,
  type ListPetsRequest,
  type UpdatePetRequest,
  type UpdatePetStatusRequest,
} from '@adopt-dont-shop/proto';

import type { PetsClient } from '../grpc-clients/pets-client.js';

import { listToEnvelope, petToView } from './pets-view.js';

export type PetsRoutesOptions = {
  client: PetsClient;
};

// Same gRPC-status → HTTP-status table the auth + notifications
// routes use.
const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

// Per-route rate limits. Reads are chatty (SPA browse + per-pet view
// counts); writes are far less frequent so the tighter caps apply
// there. All keyed on req.ip via the plugin's default key generator.
const PETS_RATE_LIMITS = {
  list: { max: 120, timeWindow: '1 minute' },
  get: { max: 240, timeWindow: '1 minute' },
  create: { max: 30, timeWindow: '1 minute' },
  update: { max: 30, timeWindow: '1 minute' },
  updateStatus: { max: 30, timeWindow: '1 minute' },
  delete: { max: 30, timeWindow: '1 minute' },
} as const;

// Body shapes — kept narrow so a client typo doesn't get silently
// forwarded as undefined to the proto encoder.
type CreatePetBody = Partial<CreatePetRequest>;
type UpdatePetBody = Partial<Omit<UpdatePetRequest, 'petId'>>;
type UpdateStatusBody = {
  toStatus?: string;
  reason?: string;
};

export const registerPetsRoutes = async (
  app: FastifyInstance,
  opts: PetsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  app.get('/api/v1/pets', { config: { rateLimit: PETS_RATE_LIMITS.list } }, async (req, reply) => {
    const query = req.query as Record<string, string | undefined>;
    const grpcReq: ListPetsRequest = {
      cursor: query.cursor,
      limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
      statusFilter: parseStatus(query.status),
      typeFilter: parseType(query.type),
      sizeFilter: parseSize(query.size),
      rescueIdFilter: query.rescueId,
    };
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      // Stage B: frontend lib.pets shape ({ success, data, meta }).
      return reply.send(listToEnvelope(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    '/api/v1/pets/:id',
    { config: { rateLimit: PETS_RATE_LIMITS.get } },
    async (req, reply) => {
      try {
        const res = await client.get({ petId: req.params.id }, buildMetadata(req));
        if (res.pet === undefined) {
          return reply.code(404).send({ success: false, error: 'pet not found' });
        }
        return reply.send({ success: true, data: petToView(res.pet) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/pets',
    { config: { rateLimit: PETS_RATE_LIMITS.create } },
    async (req, reply) => {
      const body = (req.body ?? {}) as CreatePetBody;
      const grpcReq: CreatePetRequest = {
        name: body.name ?? '',
        rescueId: body.rescueId ?? '',
        type: body.type ?? PetsV1.PetType.PET_TYPE_UNSPECIFIED,
        gender: body.gender ?? PetsV1.PetGender.PET_GENDER_UNSPECIFIED,
        size: body.size ?? PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
        ageGroup: body.ageGroup ?? PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED,
        breedId: body.breedId,
        secondaryBreedId: body.secondaryBreedId,
        shortDescription: body.shortDescription,
        longDescription: body.longDescription,
        ageYears: body.ageYears,
        ageMonths: body.ageMonths,
        adoptionFeeMinor: body.adoptionFeeMinor,
        adoptionFeeCurrency: body.adoptionFeeCurrency,
        specialNeeds: body.specialNeeds ?? false,
        houseTrained: body.houseTrained ?? false,
        temperamentJson: body.temperamentJson ?? '[]',
        tagsJson: body.tagsJson ?? '[]',
        extraJson: body.extraJson ?? '{}',
      };
      try {
        const res = await client.create(grpcReq, buildMetadata(req));
        return reply.code(201).send(PetsV1.CreatePetResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/api/v1/pets/:id',
    { config: { rateLimit: PETS_RATE_LIMITS.update } },
    async (req, reply) => {
      const body = (req.body ?? {}) as UpdatePetBody;
      const grpcReq: UpdatePetRequest = { petId: req.params.id, ...body };
      try {
        const res = await client.update(grpcReq, buildMetadata(req));
        return reply.send(PetsV1.UpdatePetResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/pets/:id/status',
    { config: { rateLimit: PETS_RATE_LIMITS.updateStatus } },
    async (req, reply) => {
      const body = (req.body ?? {}) as UpdateStatusBody;
      const grpcReq: UpdatePetStatusRequest = {
        petId: req.params.id,
        toStatus: parseStatus(body.toStatus),
        reason: body.reason,
      };
      try {
        const res = await client.updateStatus(grpcReq, buildMetadata(req));
        return reply.send(PetsV1.UpdatePetStatusResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/api/v1/pets/:id',
    { config: { rateLimit: PETS_RATE_LIMITS.delete } },
    async (req, reply) => {
      try {
        const res = await client.delete({ petId: req.params.id }, buildMetadata(req));
        return reply.send(PetsV1.DeletePetResponse.toJSON(res));
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

// Enum parsers — accept the canonical DB string (`available`, `dog`,
// `large`) AND the SCREAMING proto form (`PET_STATUS_AVAILABLE`).
// Unknown values coerce to UNSPECIFIED so the service's own
// INVALID_ARGUMENT guard produces a clean 400.

function parseStatus(raw: string | undefined): PetsV1.PetStatus {
  if (!raw) {
    return PetsV1.PetStatus.PET_STATUS_UNSPECIFIED;
  }
  const upper = `PET_STATUS_${raw.toUpperCase()}`;
  const candidate = Object.values(PetsV1.PetStatus).includes(upper as never) ? upper : raw;
  const out = PetsV1.petStatusFromJSON(candidate);
  return out === PetsV1.PetStatus.UNRECOGNIZED ? PetsV1.PetStatus.PET_STATUS_UNSPECIFIED : out;
}

function parseType(raw: string | undefined): PetsV1.PetType {
  if (!raw) {
    return PetsV1.PetType.PET_TYPE_UNSPECIFIED;
  }
  const upper = `PET_TYPE_${raw.toUpperCase()}`;
  const candidate = Object.values(PetsV1.PetType).includes(upper as never) ? upper : raw;
  const out = PetsV1.petTypeFromJSON(candidate);
  return out === PetsV1.PetType.UNRECOGNIZED ? PetsV1.PetType.PET_TYPE_UNSPECIFIED : out;
}

function parseSize(raw: string | undefined): PetsV1.PetSize {
  if (!raw) {
    return PetsV1.PetSize.PET_SIZE_UNSPECIFIED;
  }
  const upper = `PET_SIZE_${raw.toUpperCase()}`;
  const candidate = Object.values(PetsV1.PetSize).includes(upper as never) ? upper : raw;
  const out = PetsV1.petSizeFromJSON(candidate);
  return out === PetsV1.PetSize.UNRECOGNIZED ? PetsV1.PetSize.PET_SIZE_UNSPECIFIED : out;
}
