// REST → gRPC translation for /api/v1/rescue/*.
//
// Phase 4.5 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/v1/rescue/* requests before the
// catch-all sees them. Same shape as routes/pets.ts / routes/auth.ts.
//
// Route map (mirrors the monolith's existing /api/v1/rescue/* surface):
//
//   GET    /api/v1/rescue                    → RescueService.List
//   GET    /api/v1/rescue/:id                → RescueService.Get
//   POST   /api/v1/rescue                    → RescueService.Create
//   PATCH  /api/v1/rescue/:id                → RescueService.Update
//   POST   /api/v1/rescue/:id/verify         → RescueService.Verify
//   POST   /api/v1/rescue/:id/invitations    → RescueService.InviteStaff
//
// The Phase 2.5 authenticate middleware already populates x-user-*
// metadata; every RescueService RPC requires a principal.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  RescueV1,
  type CreateApplicationQuestionRequest,
  type CreateRescueRequest,
  type InviteStaffRequest,
  type ListRescuesRequest,
  type UpdateRescueRequest,
  type VerifyRescueRequest,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type RescueRoutesOptions = {
  client: RescueClient;
};

// Shared rescue object schema (proto-JSON shape from RescueV1.*Response.toJSON).
const RESCUE_SCHEMA = {
  type: 'object',
  properties: {
    rescueId: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    address: { type: 'string' },
    city: { type: 'string' },
    county: { type: 'string' },
    postcode: { type: 'string' },
    country: { type: 'string' },
    website: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

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
type QuestionBody = {
  questionKey?: string;
  question_key?: string;
  category?: string;
  questionType?: string;
  question_type?: string;
  questionText?: string;
  question_text?: string;
  helpText?: string;
  help_text?: string;
  placeholder?: string;
  options?: string[];
  sortOrder?: number;
  displayOrder?: number;
  isRequired?: boolean;
  is_required?: boolean;
};

export const registerRescueRoutes = async (
  app: FastifyInstance,
  opts: RescueRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  app.get(
    '/api/v1/rescue',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.list },
      schema: {
        tags: ['rescue'],
        summary: 'List rescues',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              rescues: { type: 'array', items: RESCUE_SCHEMA },
              nextCursor: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
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
      const grpcReq: ListRescuesRequest = {
        cursor: query.cursor,
        limit: pagination.limit,
        statusFilter: parseStatus(query.status),
      };
      try {
        const res = await client.list(grpcReq, buildMetadata(req));
        return reply.send(RescueV1.ListRescuesResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/rescue/:id',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.get },
      schema: {
        tags: ['rescue'],
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
              rescue: RESCUE_SCHEMA,
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
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
    '/api/v1/rescue',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.create },
      schema: {
        tags: ['rescue'],
        summary: 'Create a rescue',
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
            companiesHouseNumber: { type: 'string' },
            charityRegistrationNumber: { type: 'string' },
            contactPerson: { type: 'string' },
            contactTitle: { type: 'string' },
            contactEmail: { type: 'string' },
            contactPhone: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              rescue: RESCUE_SCHEMA,
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
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
    '/api/v1/rescue/:id',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.update },
      schema: {
        tags: ['rescue'],
        summary: 'Update a rescue',
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
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
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
              rescue: RESCUE_SCHEMA,
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
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
    '/api/v1/rescue/:id/verify',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.verify },
      schema: {
        tags: ['rescue'],
        summary: 'Verify a rescue',
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
            verificationSource: { type: 'string' },
            failureReason: { type: 'string' },
          },
          required: ['toStatus'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              rescue: RESCUE_SCHEMA,
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
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
    '/api/v1/rescue/:id/invitations',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.inviteStaff },
      schema: {
        tags: ['rescue'],
        summary: 'Invite staff to a rescue',
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
            email: { type: 'string', format: 'email' },
            title: { type: 'string' },
            expiresInSeconds: { type: 'number' },
          },
          required: ['email'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              invitation: { type: 'object', additionalProperties: true },
              token: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
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

  // --- Application questions -------------------------------------------
  // NOTE the PLURAL `/api/v1/rescues/:rescueId/questions` prefix — the
  // monolith's questionnaire-builder surface lived there and the SPA
  // addresses it that way (distinct from the singular /api/v1/rescue/*
  // CRUD above).

  app.get<{ Params: { rescueId: string } }>(
    '/api/v1/rescues/:rescueId/questions',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.get },
      schema: {
        tags: ['rescue'],
        summary: 'List application questions for a rescue',
        params: {
          type: 'object',
          properties: {
            rescueId: { type: 'string' },
          },
          required: ['rescueId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    questionId: { type: 'string' },
                    questionKey: { type: 'string' },
                    category: { type: 'string' },
                    questionType: { type: 'string' },
                    questionText: { type: 'string' },
                    isRequired: { type: 'boolean' },
                    displayOrder: { type: 'number' },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.listApplicationQuestions(
          { rescueId: req.params.rescueId },
          buildMetadata(req)
        );
        return reply.send({
          success: true,
          data: res.questions.map(q => RescueV1.ApplicationQuestion.toJSON(q)),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { rescueId: string } }>(
    '/api/v1/rescues/:rescueId/questions',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.update },
      schema: {
        tags: ['rescue'],
        summary: 'Create an application question for a rescue',
        params: {
          type: 'object',
          properties: {
            rescueId: { type: 'string' },
          },
          required: ['rescueId'],
        },
        body: {
          type: 'object',
          properties: {
            questionKey: { type: 'string' },
            category: { type: 'string' },
            questionType: { type: 'string' },
            questionText: { type: 'string' },
            helpText: { type: 'string' },
            placeholder: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            displayOrder: { type: 'number' },
            isRequired: { type: 'boolean' },
          },
          required: ['questionKey', 'category', 'questionType', 'questionText'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              question: {
                type: 'object',
                properties: {
                  questionId: { type: 'string' },
                  questionKey: { type: 'string' },
                  category: { type: 'string' },
                  questionType: { type: 'string' },
                  questionText: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as QuestionBody;
      const grpcReq: CreateApplicationQuestionRequest = {
        rescueId: req.params.rescueId,
        questionKey: body.questionKey ?? body.question_key ?? '',
        category: body.category ?? '',
        questionType: body.questionType ?? body.question_type ?? '',
        questionText: body.questionText ?? body.question_text ?? '',
        helpText: body.helpText ?? body.help_text,
        placeholder: body.placeholder,
        options: Array.isArray(body.options) ? body.options : [],
        displayOrder:
          typeof body.sortOrder === 'number'
            ? body.sortOrder
            : typeof body.displayOrder === 'number'
              ? body.displayOrder
              : 0,
        isRequired: Boolean(body.isRequired ?? body.is_required ?? false),
      };
      try {
        const res = await client.createApplicationQuestion(grpcReq, buildMetadata(req));
        return reply.code(201).send({
          success: true,
          question: res.question ? RescueV1.ApplicationQuestion.toJSON(res.question) : null,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { rescueId: string; questionId: string } }>(
    '/api/v1/rescues/:rescueId/questions/:questionId',
    {
      config: { rateLimit: RESCUE_RATE_LIMITS.update },
      schema: {
        tags: ['rescue'],
        summary: 'Delete an application question',
        params: {
          type: 'object',
          properties: {
            rescueId: { type: 'string' },
            questionId: { type: 'string' },
          },
          required: ['rescueId', 'questionId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              deleted: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.deleteApplicationQuestion(
          { questionId: req.params.questionId },
          buildMetadata(req)
        );
        return reply.send({ success: true, deleted: res.deleted });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

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
