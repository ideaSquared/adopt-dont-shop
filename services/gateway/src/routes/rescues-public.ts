// REST → gRPC translation for /api/v1/rescues/* (PLURAL) — the path
// the SPA actually calls. Stage B finishes the rescue contract:
// response shapes are adapted via rescue-view (snake_case, lowercase
// enum tokens, settings_json unpacked, { success, data, meta }
// envelope).
//
// The pre-existing /api/v1/rescue/* (singular) routes are kept as an
// internal/raw shape; this module is the SPA-facing layer. Both register
// when the rescue service client is wired.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  RescueV1,
  type CreateRescueRequest,
  type ListRescuesRequest,
  type UpdateRescueRequest,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { parseSettings, rescueDataEnvelope, rescueListEnvelope } from './rescue-view.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type RescuesPublicRoutesOptions = {
  client: RescueClient;
};

const RL_READ = { max: 120, timeWindow: '1 minute' } as const;
const RL_WRITE = { max: 30, timeWindow: '1 minute' } as const;

// Shared rescue view schema — the snake_case shape rescueToView() returns.
const RESCUE_VIEW_SCHEMA = {
  type: 'object',
  properties: {
    rescue_id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string', nullable: true },
    address: { type: 'string' },
    city: { type: 'string' },
    county: { type: 'string', nullable: true },
    postcode: { type: 'string' },
    country: { type: 'string' },
    website: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    mission: { type: 'string', nullable: true },
    contact_person: { type: 'string' },
    contact_title: { type: 'string', nullable: true },
    contact_email: { type: 'string', nullable: true },
    contact_phone: { type: 'string', nullable: true },
    status: { type: 'string' },
    settings: { type: 'object' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
} as const;

const RESCUE_LIST_RESPONSE = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'array', items: RESCUE_VIEW_SCHEMA },
    meta: {
      type: 'object',
      properties: {
        hasNext: { type: 'boolean' },
        nextCursor: { type: 'string' },
      },
    },
  },
} as const;

export const registerRescuesPublicRoutes = async (
  app: FastifyInstance,
  opts: RescuesPublicRoutesOptions
): Promise<void> => {
  const { client } = opts;
  await app.register(rateLimit, { global: false });

  // GET /api/v1/rescues — list with optional status filter, name search,
  // and keyset pagination. lib.rescue.searchRescues / followedRescues
  // hit this with `search=` / cursor params.
  app.get(
    '/api/v1/rescues',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: 'List rescues',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
            search: { type: 'string' },
          },
        },
        response: {
          200: RESCUE_LIST_RESPONSE,
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const grpcReq = buildListRequest(q, pagination.limit);
      try {
        const res = await client.list(grpcReq, buildMetadata(req));
        return reply.send(rescueListEnvelope(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/rescues/featured — randomized verified picks. Limit
  // defaults to 8 since the SPA renders a small carousel.
  app.get(
    '/api/v1/rescues/featured',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: 'List featured rescues',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
          },
        },
        response: {
          200: RESCUE_LIST_RESPONSE,
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 8 });
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const grpcReq: ListRescuesRequest = {
        limit: pagination.limit,
        statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
        randomize: true,
      };
      try {
        const res = await client.list(grpcReq, buildMetadata(req));
        return reply.send(rescueListEnvelope(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/rescues/search?search=…&status=… — alias for List with
  // name_search wired in.
  app.get(
    '/api/v1/rescues/search',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: 'Search rescues',
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            q: { type: 'string' },
            status: { type: 'string' },
            cursor: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: RESCUE_LIST_RESPONSE,
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const grpcReq = buildListRequest({ ...q, search: q.search ?? q.q }, pagination.limit);
      try {
        const res = await client.list(grpcReq, buildMetadata(req));
        return reply.send(rescueListEnvelope(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/rescues/nearby?lat&lng&radiusKm=… — geo filter. The
  // service stub returns empty until lat/lng columns land in the schema;
  // the SPA's UX falls back to a "no nearby rescues" empty state
  // cleanly when that happens.
  app.get(
    '/api/v1/rescues/nearby',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: 'List nearby rescues by location',
        querystring: {
          type: 'object',
          properties: {
            lat: { type: 'string' },
            lng: { type: 'string' },
            radiusKm: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: RESCUE_LIST_RESPONSE,
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 20 });
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const lat = q.lat ? Number.parseFloat(q.lat) : undefined;
      const lng = q.lng ? Number.parseFloat(q.lng) : undefined;
      const radius = q.radiusKm ? Number.parseFloat(q.radiusKm) : undefined;
      const grpcReq: ListRescuesRequest = {
        limit: pagination.limit,
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
    }
  );

  // GET /api/v1/rescues/followed — per-user follows. No follows table yet;
  // return an empty page so the SPA's "rescues you follow" surface renders
  // cleanly. A future PR adds a user_rescue_follows table + the join.
  app.get(
    '/api/v1/rescues/followed',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: 'List rescues followed by the current user',
        response: {
          200: RESCUE_LIST_RESPONSE,
        },
      },
    },
    async (_req, reply) => {
      return reply.send({
        success: true,
        data: [],
        meta: { hasNext: false },
      });
    }
  );

  // POST /api/v1/rescues/register — alias for Create. The SPA's
  // registration flow posts here.
  app.post(
    '/api/v1/rescues/register',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['rescues'],
        summary: 'Register a new rescue organisation',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            county: { type: 'string' },
            postcode: { type: 'string' },
            country: { type: 'string' },
            website: { type: 'string' },
            description: { type: 'string' },
            mission: { type: 'string' },
            contact_person: { type: 'string' },
            contact_title: { type: 'string' },
            contact_email: { type: 'string' },
            contact_phone: { type: 'string' },
          },
          required: ['name', 'email', 'address', 'city', 'postcode'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: RESCUE_VIEW_SCHEMA,
            },
          },
        },
      },
    },
    async (req, reply) => createRescue(client, req, reply)
  );

  // POST /api/v1/rescues — also Create (for admin tooling that hits the
  // canonical path).
  app.post(
    '/api/v1/rescues',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['rescues'],
        summary: 'Create a rescue organisation',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            county: { type: 'string' },
            postcode: { type: 'string' },
            country: { type: 'string' },
            website: { type: 'string' },
            description: { type: 'string' },
            mission: { type: 'string' },
            contact_person: { type: 'string' },
            contact_title: { type: 'string' },
            contact_email: { type: 'string' },
            contact_phone: { type: 'string' },
          },
          required: ['name', 'email', 'address', 'city', 'postcode'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: RESCUE_VIEW_SCHEMA,
            },
          },
        },
      },
    },
    async (req, reply) => createRescue(client, req, reply)
  );

  // GET /api/v1/rescues/:id — single rescue read. lib.rescue's
  // getRescueById hits this and parses with RescueAPIResponseSchema.
  app.get<{ Params: { id: string } }>(
    '/api/v1/rescues/:id',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: 'Get a rescue by ID',
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
              data: RESCUE_VIEW_SCHEMA,
            },
          },
        },
      },
    },
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

  // PUT /api/v1/rescues/:id — profile update. lib.rescue/app.rescue's
  // RescueSettings page saves the profile form here (plural path, same
  // base as every other rescue read above).
  app.put<{ Params: { id: string } }>(
    '/api/v1/rescues/:id',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['rescues'],
        summary: 'Update a rescue profile',
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
            phone: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                county: { type: 'string' },
                postcode: { type: 'string' },
                country: { type: 'string' },
              },
            },
            city: { type: 'string' },
            county: { type: 'string' },
            postcode: { type: 'string' },
            country: { type: 'string' },
            website: { type: 'string' },
            description: { type: 'string' },
            mission: { type: 'string' },
            contactPerson: { type: 'string' },
            contactTitle: { type: 'string' },
            contactEmail: { type: 'string' },
            contactPhone: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: RESCUE_VIEW_SCHEMA,
            },
          },
        },
      },
    },
    async (req, reply) => {
      const grpcReq = buildUpdateRequest(req.params.id, req.body);
      try {
        const res = await client.update(grpcReq, buildMetadata(req));
        if (res.rescue === undefined) {
          return reply.code(404).send({ success: false, error: 'rescue not found' });
        }
        return reply.send(rescueDataEnvelope(res.rescue));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/rescues/:id/adoption-policies — read the adoptionPolicies
  // key out of the rescue's settings JSON blob.
  app.get<{ Params: { id: string } }>(
    '/api/v1/rescues/:id/adoption-policies',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['rescues'],
        summary: "Get a rescue's adoption policies",
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
              data: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.get({ rescueId: req.params.id }, buildMetadata(req));
        if (res.rescue === undefined) {
          return reply.code(404).send({ success: false, error: 'rescue not found' });
        }
        const settings = parseSettings(res.rescue.settingsJson);
        return reply.send({ success: true, data: settings.adoptionPolicies ?? null });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /api/v1/rescues/:id/adoption-policies — replace the adoptionPolicies
  // key in settings, preserving the rest of the settings blob. UpdateRescue's
  // settingsJson field replaces the whole blob, so we read-merge-write.
  app.put<{ Params: { id: string } }>(
    '/api/v1/rescues/:id/adoption-policies',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['rescues'],
        summary: "Update a rescue's adoption policies",
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
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const current = await client.get({ rescueId: req.params.id }, buildMetadata(req));
        if (current.rescue === undefined) {
          return reply.code(404).send({ success: false, error: 'rescue not found' });
        }
        const settings = parseSettings(current.rescue.settingsJson);
        const merged = { ...settings, adoptionPolicies: req.body ?? {} };
        const res = await client.update(
          { rescueId: req.params.id, settingsJson: JSON.stringify(merged) },
          buildMetadata(req)
        );
        if (res.rescue === undefined) {
          return reply.code(404).send({ success: false, error: 'rescue not found' });
        }
        return reply.send({ success: true, data: merged.adoptionPolicies });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

function buildListRequest(
  q: Record<string, string | undefined>,
  limit: number
): ListRescuesRequest {
  const status = q.status;
  const statusFilter =
    !status || status === ''
      ? RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED
      : parseStatusFilter(status);
  return {
    cursor: q.cursor,
    limit,
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

// app.rescue's RescueProfileForm posts a nested `address: { street, city,
// county, postcode, country }` shape; UpdateRescueRequest wants those as
// flat fields (address = street). Pick whichever the caller sent.
function buildUpdateRequest(rescueId: string, body: unknown): UpdateRescueRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  const address = (b.address ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v !== '' ? v : undefined;

  return {
    rescueId,
    name: str(b.name),
    phone: str(b.phone),
    address: str(address.street) ?? str(b.address),
    city: str(address.city) ?? str(b.city),
    county: str(address.county) ?? str(b.county),
    postcode: str(address.postcode) ?? str(b.postcode),
    country: str(address.country) ?? str(b.country),
    website: str(b.website),
    description: str(b.description),
    mission: str(b.mission),
    contactPerson: str(b.contactPerson ?? b.contact_person),
    contactTitle: str(b.contactTitle ?? b.contact_title),
    contactEmail: str(b.contactEmail ?? b.contact_email),
    contactPhone: str(b.contactPhone ?? b.contact_phone),
  };
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
