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
import type { FastifyInstance } from 'fastify';

import { PetsV1, type ListPetsRequest, type UpdatePetStatusRequest } from '@adopt-dont-shop/proto';

import type { PetsClient } from '../grpc-clients/pets-client.js';

import {
  listToEnvelope,
  petToView,
  viewToCreateRequest,
  viewToUpdateRequest,
} from './pets-view.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type PetsRoutesOptions = {
  client: PetsClient;
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

// The status route still takes a small bespoke body (the create/update
// payloads are adapted from the frontend shape in pets-view.ts).
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

  app.get(
    '/api/v1/pets',
    {
      config: { rateLimit: PETS_RATE_LIMITS.list },
      schema: {
        tags: ['pets'],
        summary: 'List pets with cursor pagination and optional filters',
        // Querystring is documented only — no `required`, no integer
        // coercion (the existing handler does its own parseInt). Keeps
        // OpenAPI useful for SDK generation without changing runtime
        // validation behaviour.
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: ListPetsRequest = {
        cursor: query.cursor,
        limit: pagination.limit,
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
    }
  );

  // /stats must register BEFORE the dynamic /:id route so the literal
  // segment wins Fastify's first-registered-wins matcher.
  app.get(
    '/api/v1/pets/stats',
    {
      schema: {
        tags: ['pets'],
        summary: 'Get pet statistics, optionally filtered by rescue',
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      try {
        const res = await client.getStats({ rescueIdFilter: query.rescueId }, buildMetadata(req));
        return reply.send({ success: true, data: res });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/pets/favorites/user — the caller's own favourites. Static
  // path, so it must register BEFORE the dynamic /:id route. Returns the
  // monolith shape { success, data: { pets, total, ... } } the SPA reads.
  app.get(
    '/api/v1/pets/favorites/user',
    {
      schema: {
        tags: ['pets'],
        summary: "List the authenticated user's favourite pets",
      },
    },
    async (req, reply) => {
      try {
        const res = await client.listUserFavorites({}, buildMetadata(req));
        const pets = res.pets.map(petToView);
        return reply.send({
          success: true,
          data: { pets, total: pets.length, page: 1, totalPages: 1 },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/pets/:id',
    {
      config: { rateLimit: PETS_RATE_LIMITS.get },
      schema: {
        tags: ['pets'],
        summary: 'Get a single pet by ID',
      },
    },
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
    {
      config: { rateLimit: PETS_RATE_LIMITS.create },
      schema: {
        tags: ['pets'],
        summary: 'Create a new pet listing',
      },
    },
    async (req, reply) => {
      // Stage B: adapt the frontend snake_case/token payload → proto.
      const grpcReq = viewToCreateRequest(req.body);
      try {
        const res = await client.create(grpcReq, buildMetadata(req));
        if (res.pet === undefined) {
          return reply.code(500).send({ success: false, error: 'create returned no pet' });
        }
        return reply.code(201).send({ success: true, data: petToView(res.pet) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/api/v1/pets/:id',
    {
      config: { rateLimit: PETS_RATE_LIMITS.update },
      schema: {
        tags: ['pets'],
        summary: 'Update an existing pet listing',
      },
    },
    async (req, reply) => {
      const grpcReq = viewToUpdateRequest(req.params.id, req.body);
      try {
        const res = await client.update(grpcReq, buildMetadata(req));
        if (res.pet === undefined) {
          return reply.code(404).send({ success: false, error: 'pet not found' });
        }
        return reply.send({ success: true, data: petToView(res.pet) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/pets/:id/status',
    {
      config: { rateLimit: PETS_RATE_LIMITS.updateStatus },
      schema: {
        tags: ['pets'],
        summary: 'Update the adoption status of a pet',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as UpdateStatusBody;
      const grpcReq: UpdatePetStatusRequest = {
        petId: req.params.id,
        toStatus: parseStatus(body.toStatus),
        reason: body.reason,
      };
      try {
        const res = await client.updateStatus(grpcReq, buildMetadata(req));
        if (res.pet === undefined) {
          return reply.code(404).send({ success: false, error: 'pet not found' });
        }
        return reply.send({ success: true, data: petToView(res.pet) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/api/v1/pets/:id',
    {
      config: { rateLimit: PETS_RATE_LIMITS.delete },
      schema: {
        tags: ['pets'],
        summary: 'Delete a pet listing',
      },
    },
    async (req, reply) => {
      try {
        await client.delete({ petId: req.params.id }, buildMetadata(req));
        return reply.send({ success: true });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // --- Per-user favourites: /api/v1/pets/:id/favorite[/status] --------

  app.get<{ Params: { id: string } }>(
    '/api/v1/pets/:id/favorite/status',
    {
      schema: {
        tags: ['pets'],
        summary: 'Check whether the authenticated user has favourited a pet',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getFavoriteStatus({ petId: req.params.id }, buildMetadata(req));
        return reply.send({ success: true, data: { isFavorite: res.isFavorite } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/pets/:id/favorite',
    {
      schema: {
        tags: ['pets'],
        summary: 'Add a pet to the authenticated user favourites',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.addFavorite({ petId: req.params.id }, buildMetadata(req));
        return reply.code(201).send({ success: true, data: { favorited: res.favorited } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/api/v1/pets/:id/favorite',
    {
      schema: {
        tags: ['pets'],
        summary: 'Remove a pet from the authenticated user favourites',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.removeFavorite({ petId: req.params.id }, buildMetadata(req));
        return reply.send({ success: true, data: { removed: res.removed } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

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
