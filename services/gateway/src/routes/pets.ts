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

// Shared pet view schema — the shape petToView() returns (snake_case,
// lowercase enum tokens, optional long-tail fields from extra_json).
const PET_VIEW_SCHEMA = {
  type: 'object',
  properties: {
    pet_id: { type: 'string' },
    name: { type: 'string' },
    rescue_id: { type: 'string' },
    type: { type: 'string' },
    status: { type: 'string' },
    gender: { type: 'string' },
    size: { type: 'string' },
    age_group: { type: 'string' },
    short_description: { type: 'string' },
    long_description: { type: 'string' },
    age_years: { type: 'number' },
    age_months: { type: 'number' },
    color: { type: 'string' },
    archived: { type: 'boolean' },
    featured: { type: 'boolean' },
    priority_listing: { type: 'boolean' },
    special_needs: { type: 'boolean' },
    house_trained: { type: 'boolean' },
    adoption_fee: { type: 'string' },
    temperament: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    view_count: { type: 'number' },
    favorite_count: { type: 'number' },
    application_count: { type: 'number' },
    available_since: { type: 'string' },
    adopted_date: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
} as const;

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
  bulkUpdate: { max: 10, timeWindow: '1 minute' },
} as const;

// The status route still takes a small bespoke body (the create/update
// payloads are adapted from the frontend shape in pets-view.ts).
type UpdateStatusBody = {
  toStatus?: string;
  reason?: string;
};

// Admin Pets-page bulk actions. Each operation fans out to the matching
// per-pet RPC (so each pet gets full validation + its own authz), and the
// per-pet outcomes are collected into the SPA's BulkPetResult envelope.
type BulkUpdateBody = {
  petIds?: string[];
  operation?: string;
  data?: { status?: string };
  reason?: string;
};

const BULK_PET_OPERATIONS = ['update_status', 'archive', 'feature', 'delete'];

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
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
            type: { type: 'string' },
            size: { type: 'string' },
            rescueId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: PET_VIEW_SCHEMA },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
              },
            },
          },
        },
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
        querystring: {
          type: 'object',
          properties: {
            rescueId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
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
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  pets: { type: 'array', items: PET_VIEW_SCHEMA },
                  total: { type: 'number' },
                  page: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: PET_VIEW_SCHEMA,
            },
          },
        },
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
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            rescue_id: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
            gender: { type: 'string' },
            size: { type: 'string' },
            age_group: { type: 'string' },
            short_description: { type: 'string' },
            long_description: { type: 'string' },
            age_years: { type: 'number' },
            age_months: { type: 'number' },
            adoption_fee: { type: 'string' },
            special_needs: { type: 'boolean' },
            house_trained: { type: 'boolean' },
            featured: { type: 'boolean' },
            priority_listing: { type: 'boolean' },
            temperament: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'rescue_id'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: PET_VIEW_SCHEMA,
            },
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: { type: 'string' },
            gender: { type: 'string' },
            size: { type: 'string' },
            age_group: { type: 'string' },
            short_description: { type: 'string' },
            long_description: { type: 'string' },
            age_years: { type: 'number' },
            age_months: { type: 'number' },
            adoption_fee: { type: 'string' },
            special_needs: { type: 'boolean' },
            house_trained: { type: 'boolean' },
            featured: { type: 'boolean' },
            priority_listing: { type: 'boolean' },
            temperament: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: PET_VIEW_SCHEMA,
            },
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            toStatus: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['toStatus'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: PET_VIEW_SCHEMA,
            },
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
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

  // POST /api/v1/pets/bulk-update — admin bulk actions. Fans out per pet to
  // the matching RPC; per-pet failures (auth, illegal transition, …) are
  // collected rather than failing the whole batch, mirroring the rescues
  // bulk-update route.
  app.post<{ Body: BulkUpdateBody }>(
    '/api/v1/pets/bulk-update',
    {
      config: { rateLimit: PETS_RATE_LIMITS.bulkUpdate },
      schema: {
        tags: ['pets'],
        summary: 'Bulk update pets (status / archive / feature / delete)',
        body: {
          type: 'object',
          properties: {
            petIds: { type: 'array', items: { type: 'string' } },
            operation: {
              type: 'string',
              enum: ['update_status', 'archive', 'feature', 'delete'],
            },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string' },
              },
            },
            reason: { type: 'string' },
          },
          required: ['petIds', 'operation'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  successCount: { type: 'number' },
                  failedCount: { type: 'number' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        petId: { type: 'string' },
                        error: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      const petIds = body.petIds ?? [];
      const operation = body.operation ?? '';
      if (petIds.length === 0) {
        return reply.code(400).send({ success: false, error: 'petIds is required' });
      }
      if (!BULK_PET_OPERATIONS.includes(operation)) {
        return reply.code(400).send({
          success: false,
          error: `operation must be one of ${BULK_PET_OPERATIONS.join(', ')}`,
        });
      }

      let toStatus = PetsV1.PetStatus.PET_STATUS_UNSPECIFIED;
      if (operation === 'update_status') {
        toStatus = parseStatus(body.data?.status);
        if (toStatus === PetsV1.PetStatus.PET_STATUS_UNSPECIFIED) {
          return reply
            .code(400)
            .send({ success: false, error: 'data.status is required for update_status' });
        }
      }

      const metadata = buildMetadata(req);
      const runOne = (petId: string): Promise<unknown> => {
        switch (operation) {
          case 'update_status':
            return client.updateStatus({ petId, toStatus, reason: body.reason }, metadata);
          case 'archive':
            return client.update({ petId, archived: true }, metadata);
          case 'feature':
            return client.update({ petId, featured: true }, metadata);
          default:
            return client.delete({ petId }, metadata);
        }
      };

      const results = await Promise.all(
        petIds.map(petId =>
          runOne(petId)
            .then(() => ({ petId, ok: true as const }))
            .catch((err: unknown) => ({ petId, ok: false as const, error: grpcMessage(err) }))
        )
      );
      const errors = results
        .filter((r): r is { petId: string; ok: false; error: string } => !r.ok)
        .map(r => ({ petId: r.petId, error: r.error }));
      const successCount = results.length - errors.length;

      return reply.send({
        success: true,
        message: `Updated ${successCount} of ${petIds.length} pets`,
        data: { successCount, failedCount: errors.length, errors },
      });
    }
  );

  // --- Per-user favourites: /api/v1/pets/:id/favorite[/status] --------

  app.get<{ Params: { id: string } }>(
    '/api/v1/pets/:id/favorite/status',
    {
      schema: {
        tags: ['pets'],
        summary: 'Check whether the authenticated user has favourited a pet',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  isFavorite: { type: 'boolean' },
                },
              },
            },
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  favorited: { type: 'boolean' },
                },
              },
            },
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  removed: { type: 'boolean' },
                },
              },
            },
          },
        },
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

// Best-effort human message from a rejected gRPC call, for the per-pet
// error list in the bulk-update envelope.
function grpcMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'details' in err && typeof err.details === 'string') {
    return err.details;
  }
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return 'operation failed';
}

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
