// REST → gRPC translation for /api/v1/applications/*.
//
// Phase 5.3d cutover. Same strangler-fig shape as routes/moderation.ts
// (#929) / routes/matching.ts (#923) — registers BEFORE the catch-all
// proxy so first-registered-wins prefix routing picks it off.
//
// Two layers (ADR 0002, Stage B):
//
//   Frontend contract (what lib.applications calls) — responses use the
//   collapsed view shape (applications-view.ts) in a `{ data }` envelope:
//   POST   /api/v1/applications              → StartDraft+SaveDraftAnswers+SubmitDraft
//   PUT    /api/v1/applications/:id          → Get(version)+SaveDraftAnswers (edit)
//   PATCH  /api/v1/applications/:id/status   → Approve | Reject | Withdraw
//   PUT    /api/v1/applications/:id/withdraw → Withdraw
//   GET    /api/v1/applications/stats        → GetStats (collapsed counts)
//   GET    /api/v1/applications              → List  (drafts filtered)
//   GET    /api/v1/applications/:id          → Get   (draft → 404)
//
//   Service-shaped routes (granular RPCs for rescue-staff / internal
//   callers) — responses are raw proto-JSON:
//   PATCH  /:id/answers, POST /:id/submit, POST /:id/review,
//   POST /:id/home-visit/{schedule,complete}, POST /:id/{approve,reject,
//   withdraw,adopt}.
//
// Authz lives in the service handlers; the gateway stamps x-user-*
// metadata via the Phase 2.5 authenticate middleware. These routes only
// serve traffic when CUTOVER_APPLICATIONS is on (else /api/v1/* proxies
// to the monolith) — see server.ts.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  ApplicationsV1,
  type Application,
  type ApproveRequest,
  type CompleteHomeVisitRequest,
  type ListApplicationsRequest,
  type RejectRequest,
  type SaveDraftAnswersRequest,
  type ScheduleHomeVisitRequest,
  type StartReviewRequest,
  type SubmitDraftRequest,
  type WithdrawRequest,
} from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';

import { applicationToView, statsToView, type ApplicationView } from './applications-view.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type ApplicationsRoutesOptions = {
  client: ApplicationsClient;
};

// Writes 30/min, reads 120/min — adopter + rescue-staff human use.
const RL_WRITE = { max: 30, timeWindow: '1 minute' } as const;
const RL_READ = { max: 120, timeWindow: '1 minute' } as const;

const num = (raw: unknown): number =>
  typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseInt(raw, 10) || 0 : 0;

export const registerApplicationsRoutes = async (
  app: FastifyInstance,
  opts: ApplicationsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  // ---------- Frontend write contract (lib.applications) ----------
  //
  // The SPA's create is a single POST carrying the whole ApplicationData
  // object; the service models it as draft → submitted. So the gateway
  // ORCHESTRATES StartDraft → SaveDraftAnswers → SubmitDraft, threading
  // the optimistic-concurrency version from each response into the next,
  // and stores the frontend's data blob verbatim as answers so it
  // round-trips on read (applications-view.ts parses it back into `data`).

  app.post('/api/v1/applications', {
    config: { rateLimit: RL_WRITE },
    schema: {
      tags: ['applications'],
      summary: 'Create and submit an adoption application',
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }, async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const adopterId = (b.userId as string) ?? (b.adopterId as string) ?? headerUserId(req) ?? '';
    const petId = (b.petId as string) ?? '';
    const meta = buildMetadata(req);
    try {
      const started = await client.startDraft({ adopterId, petId }, meta);
      const draft = requireApplication(started.application);

      const saved = await client.saveDraftAnswers(
        {
          applicationId: draft.applicationId,
          expectedVersion: draft.version,
          answersPatchJson: JSON.stringify(b),
        },
        meta
      );
      const withAnswers = requireApplication(saved.application);

      const submitted = await client.submitDraft(
        { applicationId: withAnswers.applicationId, expectedVersion: withAnswers.version },
        meta
      );
      return sendView(reply, submitted.application, 201);
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // PATCH /:id/status — the SPA's updateApplicationStatus. The frontend's
  // 4-value status maps onto the service's decision commands.
  app.patch<{ Params: { id: string } }>(
    '/api/v1/applications/:id/status',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Update application status',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            notes: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const target = b.status as string | undefined;
      const notes = b.notes as string | undefined;
      const id = req.params.id;
      const meta = buildMetadata(req);
      try {
        if (target === 'approved') {
          const res = await client.approve({ applicationId: id, notes }, meta);
          return sendView(reply, res.application);
        }
        if (target === 'rejected') {
          const res = await client.reject({ applicationId: id, reason: notes ?? '' }, meta);
          return sendView(reply, res.application);
        }
        if (target === 'withdrawn') {
          const res = await client.withdraw({ applicationId: id, reason: notes }, meta);
          return sendView(reply, res.application);
        }
        return reply.code(400).send({ error: `unsupported status transition: ${target ?? ''}` });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /:id/withdraw — the SPA's withdrawApplication.
  app.put<{ Params: { id: string } }>(
    '/api/v1/applications/:id/withdraw',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Withdraw an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      try {
        const res = await client.withdraw(
          { applicationId: req.params.id, reason: b.reason as string | undefined },
          buildMetadata(req)
        );
        return sendView(reply, res.application);
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /:id — the SPA's updateApplication (edit answers). The frontend
  // sends the whole ApplicationData blob without a version, so we Get the
  // current version first, then SaveDraftAnswers with the blob. NOTE the
  // behaviour change vs the monolith: the service only allows answer edits
  // while the application is in `draft` / `under_review`; editing a
  // decided application surfaces the service's INVALID_ARGUMENT as 400.
  app.put<{ Params: { id: string } }>(
    '/api/v1/applications/:id',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Update application answers',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const id = req.params.id;
      const meta = buildMetadata(req);
      try {
        const current = await client.get({ applicationId: id, includeTimeline: false }, meta);
        const version = current.application?.version ?? 0;
        const res = await client.saveDraftAnswers(
          { applicationId: id, expectedVersion: version, answersPatchJson: JSON.stringify(b) },
          meta
        );
        return sendView(reply, res.application);
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Service-shaped routes (draft + staff lifecycle) ----------
  // Lower-level RPC routes retained for rescue-staff / internal callers
  // that drive the granular lifecycle (the SPA's lib.applications uses the
  // frontend contract above). Responses are proto-JSON.

  app.patch<{ Params: { id: string } }>(
    '/api/v1/applications/:id/answers',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Save draft answers for an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            expectedVersion: { type: 'number' },
            answersPatchJson: { type: 'string' },
            referencesJson: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: SaveDraftAnswersRequest = {
        applicationId: req.params.id,
        expectedVersion: num(b.expectedVersion),
        answersPatchJson: (b.answersPatchJson as string) ?? '',
        referencesJson: b.referencesJson as string | undefined,
      };
      try {
        const res = await client.saveDraftAnswers(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.SaveDraftAnswersResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/submit',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Submit a draft application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            expectedVersion: { type: 'number' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: SubmitDraftRequest = {
        applicationId: req.params.id,
        expectedVersion: num(b.expectedVersion),
      };
      try {
        const res = await client.submitDraft(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.SubmitDraftResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Review / home visit / decision ----------

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/review',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Start review of an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            note: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: StartReviewRequest = {
        applicationId: req.params.id,
        note: b.note as string | undefined,
      };
      try {
        const res = await client.startReview(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.StartReviewResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/home-visit/schedule',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Schedule a home visit for an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            scheduledAt: { type: 'string' },
            note: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: ScheduleHomeVisitRequest = {
        applicationId: req.params.id,
        scheduledAt: (b.scheduledAt as string) ?? '',
        note: b.note as string | undefined,
      };
      try {
        const res = await client.scheduleHomeVisit(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.ScheduleHomeVisitResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/home-visit/complete',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Complete a home visit for an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            outcome: { type: 'string' },
            notes: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: CompleteHomeVisitRequest = {
        applicationId: req.params.id,
        outcome: parseHomeVisitOutcome(b.outcome as string | undefined),
        notes: b.notes as string | undefined,
      };
      try {
        const res = await client.completeHomeVisit(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.CompleteHomeVisitResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/approve',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Approve an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: ApproveRequest = {
        applicationId: req.params.id,
        notes: b.notes as string | undefined,
      };
      try {
        const res = await client.approve(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.ApproveResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/reject',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Reject an application',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: RejectRequest = {
        applicationId: req.params.id,
        reason: (b.reason as string) ?? '',
      };
      try {
        const res = await client.reject(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.RejectResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/withdraw',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Withdraw an application (service-shaped)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: WithdrawRequest = {
        applicationId: req.params.id,
        reason: b.reason as string | undefined,
      };
      try {
        const res = await client.withdraw(grpcReq, buildMetadata(req));
        return reply.send(ApplicationsV1.WithdrawResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/adopt',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Mark an application as adopted',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.markAdopted({ applicationId: req.params.id }, buildMetadata(req));
        return reply.send(ApplicationsV1.MarkAdoptedResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Reads ----------

  // Registered before /:id so the static `stats` segment wins over the
  // param route. Collapses the service's raw per-status counts to the
  // SPA's ApplicationStatsSchema, wrapped in `{ data }`.
  app.get('/api/v1/applications/stats', {
    config: { rateLimit: RL_READ },
    schema: {
      tags: ['applications'],
      summary: 'Get application statistics',
      querystring: {
        type: 'object',
        properties: {
          rescue: { type: 'string' },
          adopter: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
  }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    try {
      const res = await client.getStats(
        { rescueIdFilter: q.rescue, adopterIdFilter: q.adopter },
        buildMetadata(req)
      );
      return reply.send({ data: statsToView(res) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get('/api/v1/applications', {
    config: { rateLimit: RL_READ },
    schema: {
      tags: ['applications'],
      summary: 'List applications',
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'string' },
          status: { type: 'string' },
          rescue: { type: 'string' },
          adopter: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
  }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(q, { limit: 0 });
    if (!pagination.ok) {
      return reply.code(400).send({ error: pagination.error });
    }
    const grpcReq: ListApplicationsRequest = {
      cursor: q.cursor,
      limit: pagination.limit,
      statusFilter: parseStatus(q.status),
      rescueIdFilter: q.rescue,
      adopterIdFilter: q.adopter,
    };
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      // Stage B: map to the frontend view + drop draft/unspecified rows,
      // and wrap in the `{ data }` envelope the SPA expects.
      const data = res.applications
        .map(applicationToView)
        .filter((v): v is ApplicationView => v !== null);
      return reply.send({ data });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    '/api/v1/applications/:id',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['applications'],
        summary: 'Get an application by ID',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            timeline: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      try {
        const res = await client.get(
          { applicationId: req.params.id, includeTimeline: q.timeline === 'true' },
          buildMetadata(req)
        );
        // Stage B: a draft / unspecified application has no frontend
        // representation — treat it as not found rather than emitting a
        // shape the SPA can't parse.
        const view = res.application ? applicationToView(res.application) : null;
        if (view === null) {
          return reply.code(404).send({ error: 'application not found' });
        }
        return reply.send({ data: view });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

function headerUserId(req: FastifyRequest): string | undefined {
  const raw = (req.headers as Record<string, string | string[] | undefined>)['x-user-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

// Every gRPC command response carries the updated Application; this should
// always be present after a successful call, but the proto field is
// optional, so guard it rather than assert. A plain Error (no grpc `code`)
// maps to 500 via handleGrpcError's default branch.
function requireApplication(application: Application | undefined): Application {
  if (application === undefined) {
    throw new Error('the service returned no application');
  }
  return application;
}

// Send the frontend view in the `{ data }` envelope. A successful write
// should leave the application in a frontend-visible state; if the view
// is null (e.g. it's still a draft — not a frontend write flow) we 500
// rather than emit a shape the SPA can't parse.
function sendView(
  reply: FastifyReply,
  application: Application | undefined,
  code = 200
): FastifyReply {
  const view = application ? applicationToView(application) : null;
  if (view === null) {
    return reply.code(500).send({ error: 'unexpected application state' });
  }
  return reply.code(code).send({ data: view });
}

// Enum parsers — accept the DB form ('passed', 'approved') AND the
// SCREAMING proto form ('HOME_VISIT_OUTCOME_PASSED'). Unknown coerces
// to UNSPECIFIED so the service's INVALID_ARGUMENT guard produces a
// clean 400.
function parseEnum<E extends Record<string, string | number>>(
  enumObj: E,
  prefix: string,
  fromJSON: (s: string) => number,
  unspecified: number,
  unrecognized: number,
  raw: string | undefined
): number {
  if (!raw) {
    return unspecified;
  }
  const upper = `${prefix}_${raw.toUpperCase()}`;
  const candidate = Object.values(enumObj).includes(upper as never) ? upper : raw;
  const out = fromJSON(candidate);
  return out === unrecognized ? unspecified : out;
}

function parseStatus(raw: string | undefined): ApplicationsV1.ApplicationStatus {
  return parseEnum(
    ApplicationsV1.ApplicationStatus,
    'APPLICATION_STATUS',
    ApplicationsV1.applicationStatusFromJSON,
    ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED,
    ApplicationsV1.ApplicationStatus.UNRECOGNIZED,
    raw
  );
}

function parseHomeVisitOutcome(raw: string | undefined): ApplicationsV1.HomeVisitOutcome {
  return parseEnum(
    ApplicationsV1.HomeVisitOutcome,
    'HOME_VISIT_OUTCOME',
    ApplicationsV1.homeVisitOutcomeFromJSON,
    ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_UNSPECIFIED,
    ApplicationsV1.HomeVisitOutcome.UNRECOGNIZED,
    raw
  );
}
