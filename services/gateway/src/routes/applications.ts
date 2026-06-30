// REST → gRPC translation for /api/v1/applications/*.
//
// Same shape as routes/moderation.ts (#929) / routes/matching.ts (#923)
// — registers BEFORE the /api/* 404 handler so first-registered-wins
// prefix routing picks it off.
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
// metadata via the authenticate middleware. These routes register
// whenever the applications service client is wired — see server.ts.

import rateLimit from '@fastify/rate-limit';
import type { Metadata } from '@grpc/grpc-js';
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
import { GRPC_TO_HTTP, handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type ApplicationsRoutesOptions = {
  client: ApplicationsClient;
};

// Shared application view schema — the shape applicationToView() returns.
const APPLICATION_VIEW_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    petId: { type: 'string' },
    userId: { type: 'string' },
    rescueId: { type: 'string' },
    status: { type: 'string', enum: ['submitted', 'approved', 'rejected', 'withdrawn'] },
    stage: {
      type: 'string',
      enum: ['pending', 'reviewing', 'visiting', 'deciding', 'resolved', 'withdrawn'],
    },
    submittedAt: { type: 'string', nullable: true },
    reviewedAt: { type: 'string', nullable: true },
    reviewedBy: { type: 'string', nullable: true },
    reviewNotes: { type: 'string', nullable: true },
    data: { type: 'object' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

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

  app.post(
    '/api/v1/applications',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Create and submit an adoption application',
        body: {
          type: 'object',
          properties: {
            petId: { type: 'string' },
          },
          required: ['petId'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: APPLICATION_VIEW_SCHEMA,
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      // ADS-879: identity is never trusted from the body — always the
      // authenticated principal, so a stale/forged userId can't impersonate
      // another adopter even if a downstream permission check regresses.
      const adopterId = headerUserId(req) ?? '';
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
    }
  );

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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['approved', 'rejected', 'withdrawn'] },
            notes: { type: 'string' },
          },
          required: ['status'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: APPLICATION_VIEW_SCHEMA,
            },
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: APPLICATION_VIEW_SCHEMA,
            },
          },
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
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: APPLICATION_VIEW_SCHEMA,
            },
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            expectedVersion: { type: 'number' },
            answersPatchJson: { type: 'string' },
            referencesJson: { type: 'string' },
          },
          required: ['expectedVersion', 'answersPatchJson'],
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            expectedVersion: { type: 'number' },
          },
          required: ['expectedVersion'],
        },
        response: {
          200: {
            type: 'object',
          },
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

  // ---------- Bulk update (ADS-874) ----------
  //
  // ADS-642 (frontend): single-row stage transitions AND the multi-select
  // BulkActionBar both dispatch through this one endpoint — there is no
  // dedicated stage-transition route. `updates` is a free-form patch; we
  // translate the fields the SPA actually sends (status / stage / notes /
  // rejectionReason / withdrawalReason / scheduledAt / outcome) onto the
  // matching service command per application. A batch can mix valid and
  // invalid rows, so a single item's failure doesn't abort the others.
  app.patch(
    '/api/v1/applications/bulk-update',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: 'Apply the same status/stage transition to a batch of applications',
        body: {
          type: 'object',
          properties: {
            applicationIds: { type: 'array', items: { type: 'string' } },
            updates: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                stage: { type: 'string' },
                notes: { type: 'string' },
                rejectionReason: { type: 'string' },
                withdrawalReason: { type: 'string' },
                scheduledAt: { type: 'string' },
                outcome: { type: 'string' },
              },
            },
          },
          required: ['applicationIds', 'updates'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  successCount: { type: 'number' },
                  failureCount: { type: 'number' },
                  failures: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        applicationId: { type: 'string' },
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
      const b = (req.body ?? {}) as Record<string, unknown>;
      const applicationIds = Array.isArray(b.applicationIds)
        ? b.applicationIds.filter((id): id is string => typeof id === 'string')
        : [];
      const updates = (b.updates ?? {}) as Record<string, unknown>;

      if (applicationIds.length === 0) {
        return reply.code(400).send({ error: 'applicationIds must be a non-empty array' });
      }

      const meta = buildMetadata(req);
      const failures: Array<{ applicationId: string; error: string }> = [];
      for (const applicationId of applicationIds) {
        try {
          await applyBulkUpdate(client, applicationId, updates, meta);
        } catch (err) {
          failures.push({ applicationId, error: describeGrpcError(err) });
        }
      }

      return reply.send({
        data: {
          successCount: applicationIds.length - failures.length,
          failureCount: failures.length,
          failures,
        },
      });
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            note: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            scheduledAt: { type: 'string' },
            note: { type: 'string' },
          },
          required: ['scheduledAt'],
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            outcome: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['outcome'],
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
          required: ['reason'],
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
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
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
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
  app.get(
    '/api/v1/applications/stats',
    {
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
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  submitted: { type: 'number' },
                  underReview: { type: 'number' },
                  approved: { type: 'number' },
                  rejected: { type: 'number' },
                  pendingReferences: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
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
    }
  );

  app.get(
    '/api/v1/applications',
    {
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
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: APPLICATION_VIEW_SCHEMA,
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
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
    }
  );

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
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            timeline: { type: 'string', enum: ['true', 'false'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: APPLICATION_VIEW_SCHEMA,
            },
          },
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

  // ---------- Application drafts (autosave scratchpad) ----------
  //
  // Backend-synced draft for a (caller, pet) pair — the autosave the SPA
  // writes while the adopter fills out the form (useApplicationDraft.ts).
  // Scoped to the caller via x-user-id metadata; distinct from the
  // event-sourced draft Application above. `drafts/:petId` is two static-
  // then-param segments, so it never collides with the one-segment
  // `/api/v1/applications/:id` route.

  app.get<{ Params: { petId: string } }>(
    '/api/v1/applications/drafts/:petId',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['applications'],
        summary: "Get the caller's saved draft for a pet",
        params: {
          type: 'object',
          properties: {
            petId: { type: 'string' },
          },
          required: ['petId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  petId: { type: 'string' },
                  answers: { type: 'object' },
                  updatedAt: { type: 'string' },
                  expiresAt: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getApplicationDraft(
          { petId: req.params.petId },
          buildMetadata(req)
        );
        // No draft yet is the common case — 404 is the SPA's "start fresh"
        // signal (useApplicationDraft treats it as non-error).
        if (!res.found) {
          return reply.code(404).send({ error: 'draft not found' });
        }
        return reply.send({ data: draftToView(req.params.petId, res) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.put<{ Params: { petId: string } }>(
    '/api/v1/applications/drafts/:petId',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: "Upsert the caller's draft for a pet (last-write-wins)",
        params: {
          type: 'object',
          properties: {
            petId: { type: 'string' },
          },
          required: ['petId'],
        },
        body: {
          type: 'object',
          properties: {
            answers: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  petId: { type: 'string' },
                  answers: { type: 'object' },
                  updatedAt: { type: 'string' },
                  expiresAt: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const answers = b.answers ?? {};
      try {
        const res = await client.saveApplicationDraft(
          { petId: req.params.petId, answersJson: JSON.stringify(answers) },
          buildMetadata(req)
        );
        return reply.send({ data: draftToView(req.params.petId, res) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { petId: string } }>(
    '/api/v1/applications/drafts/:petId',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: "Delete the caller's draft for a pet",
        params: {
          type: 'object',
          properties: {
            petId: { type: 'string' },
          },
          required: ['petId'],
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (req, reply) => {
      try {
        await client.deleteApplicationDraft({ petId: req.params.petId }, buildMetadata(req));
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Adopter application defaults ----------
  //
  // Reusable personal-info / living-situation / pet-experience / references
  // data the SPA uses to pre-populate new applications (applicationProfileService.ts).
  // Always scoped to the caller via x-user-id metadata — no id in the URL or body.

  app.get(
    '/api/v1/profile/application-defaults',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['applications'],
        summary: "Get the caller's saved application defaults",
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getApplicationDefaults({}, buildMetadata(req));
        return reply.send({ data: res.defaultsJson === '' ? {} : JSON.parse(res.defaultsJson) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.put(
    '/api/v1/profile/application-defaults',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['applications'],
        summary: "Deep-merge a patch into the caller's saved application defaults",
        body: {
          type: 'object',
          properties: {
            applicationDefaults: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const patch = b.applicationDefaults ?? {};
      try {
        const res = await client.updateApplicationDefaults(
          { defaultsPatchJson: JSON.stringify(patch) },
          buildMetadata(req)
        );
        return reply.send({ data: JSON.parse(res.defaultsJson) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// Shape a draft gRPC response into the SPA's ApplicationDraftPayload.
// Both Get and Save responses carry these fields; expires_at is optional
// on the wire and surfaces as null when unset.
function draftToView(
  petId: string,
  res: { answersJson: string; updatedAt: string; expiresAt?: string }
): { petId: string; answers: unknown; updatedAt: string; expiresAt: string | null } {
  return {
    petId,
    answers: res.answersJson === '' ? {} : JSON.parse(res.answersJson),
    updatedAt: res.updatedAt,
    expiresAt: res.expiresAt ?? null,
  };
}

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

// Bulk-update's per-item command dispatch (ADS-874). `status` (a terminal
// decision) wins when present; otherwise `stage` drives the matching
// workflow command. The frontend's 5-stage model (PENDING/REVIEWING/
// VISITING/DECIDING/RESOLVED) is coarser than the service's 9-state
// lifecycle, so `stage` maps onto the closest matching command — an
// out-of-order transition (e.g. `visiting` while still a draft) surfaces
// as the service's own FAILED_PRECONDITION rather than being pre-validated
// here.
async function applyBulkUpdate(
  client: ApplicationsClient,
  applicationId: string,
  updates: Record<string, unknown>,
  meta: Metadata
): Promise<void> {
  const status = updates.status as string | undefined;
  const notes = updates.notes as string | undefined;

  if (status === 'approved') {
    await client.approve({ applicationId, notes }, meta);
    return;
  }
  if (status === 'rejected') {
    await client.reject(
      { applicationId, reason: (updates.rejectionReason as string | undefined) ?? notes ?? '' },
      meta
    );
    return;
  }
  if (status === 'withdrawn') {
    await client.withdraw(
      { applicationId, reason: (updates.withdrawalReason as string | undefined) ?? notes },
      meta
    );
    return;
  }

  const stage = (updates.stage as string | undefined)?.toLowerCase();
  if (stage === 'reviewing') {
    await client.startReview({ applicationId, note: notes }, meta);
    return;
  }
  if (stage === 'visiting') {
    const scheduledAt = (updates.scheduledAt ?? updates.scheduledDate) as string | undefined;
    if (!scheduledAt) {
      throw new Error('scheduledAt is required to move an application to the visiting stage');
    }
    await client.scheduleHomeVisit({ applicationId, scheduledAt, note: notes }, meta);
    return;
  }
  if (stage === 'deciding') {
    await client.completeHomeVisit(
      {
        applicationId,
        outcome: parseHomeVisitOutcome(updates.outcome as string | undefined),
        notes,
      },
      meta
    );
    return;
  }

  throw new Error('updates must include a recognised status or stage transition');
}

// Per-item error message for the bulk-update response body. A gRPC error
// (has a `code`) mirrors handleGrpcError's 4xx-vs-5xx split — don't leak
// internal error text for server-side failures. A plain Error (no `code`)
// is one applyBulkUpdate raised itself before calling the client (e.g. a
// missing scheduledAt) — its message is ours to show, so surface it as-is.
function describeGrpcError(err: unknown): string {
  const grpcErr = err as { code?: number; details?: string; message?: string };
  if (grpcErr?.code === undefined) {
    return grpcErr?.message ?? 'internal_error';
  }
  const httpStatus = GRPC_TO_HTTP[grpcErr.code] || 500;
  if (httpStatus >= 500) {
    return 'internal_error';
  }
  return grpcErr?.details ?? grpcErr?.message ?? 'internal_error';
}
