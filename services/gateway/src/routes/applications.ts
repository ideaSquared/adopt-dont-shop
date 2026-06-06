// REST → gRPC translation for /api/applications/*.
//
// Phase 5.3d cutover. Same strangler-fig shape as routes/moderation.ts
// (#929) / routes/matching.ts (#923) — registers BEFORE the catch-all
// proxy so first-registered-wins prefix routing picks it off.
//
// Route map (all 12 ApplicationService RPCs):
//
//   Drafts
//   POST   /api/applications                              → StartDraft
//   PATCH  /api/applications/:id/answers                  → SaveDraftAnswers
//   POST   /api/applications/:id/submit                   → SubmitDraft
//   Review / home visit / decision
//   POST   /api/applications/:id/review                   → StartReview
//   POST   /api/applications/:id/home-visit/schedule      → ScheduleHomeVisit
//   POST   /api/applications/:id/home-visit/complete      → CompleteHomeVisit
//   POST   /api/applications/:id/approve                  → Approve
//   POST   /api/applications/:id/reject                   → Reject
//   POST   /api/applications/:id/withdraw                 → Withdraw
//   POST   /api/applications/:id/adopt                    → MarkAdopted
//   Reads
//   GET    /api/applications                              → List
//   GET    /api/applications/:id                          → Get
//
// Authz lives in the handlers (adopters act on their own drafts; rescue
// staff gate on applications.review/approve/reject; reads scope to
// owner/rescue/admin). The gateway stamps x-user-* metadata via the
// Phase 2.5 authenticate middleware.
//
// StartDraft is currently an UNIMPLEMENTED stub on the service (it needs
// the service.pets gRPC client to resolve pet → rescue), which maps to
// 501 here so the SPA gets an honest "not yet" rather than a fall-through
// to the monolith.

import rateLimit from '@fastify/rate-limit';
import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  ApplicationsV1,
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

export type ApplicationsRoutesOptions = {
  client: ApplicationsClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.UNIMPLEMENTED]: 501,
  [status.INTERNAL]: 500,
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

  // ---------- Drafts ----------

  app.post('/api/applications', { config: { rateLimit: RL_WRITE } }, async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    try {
      const res = await client.startDraft(
        { adopterId: (b.adopterId as string) ?? '', petId: (b.petId as string) ?? '' },
        buildMetadata(req)
      );
      return reply.code(201).send(ApplicationsV1.StartDraftResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.patch<{ Params: { id: string } }>(
    '/api/applications/:id/answers',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/submit',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/review',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/home-visit/schedule',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/home-visit/complete',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/approve',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/reject',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/withdraw',
    { config: { rateLimit: RL_WRITE } },
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
    '/api/applications/:id/adopt',
    { config: { rateLimit: RL_WRITE } },
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

  app.get('/api/applications', { config: { rateLimit: RL_READ } }, async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const grpcReq: ListApplicationsRequest = {
      cursor: q.cursor,
      limit: q.limit ? Number.parseInt(q.limit, 10) : 0,
      statusFilter: parseStatus(q.status),
      rescueIdFilter: q.rescue,
      adopterIdFilter: q.adopter,
    };
    try {
      const res = await client.list(grpcReq, buildMetadata(req));
      return reply.send(ApplicationsV1.ListApplicationsResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    '/api/applications/:id',
    { config: { rateLimit: RL_READ } },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      try {
        const res = await client.get(
          { applicationId: req.params.id, includeTimeline: q.timeline === 'true' },
          buildMetadata(req)
        );
        return reply.send(ApplicationsV1.GetApplicationResponse.toJSON(res));
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
