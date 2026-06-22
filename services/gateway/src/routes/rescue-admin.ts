// REST → gRPC translation for the admin rescue detail surface.
//
// app.admin's rescueService calls these per-rescue admin endpoints, none
// of which the gateway served (they 404'd):
//
//   PATCH /api/v1/admin/rescues/:rescueId/plan   → RescueService.UpdateRescuePlan
//   GET   /api/v1/rescues/:rescueId/analytics    → RescueService.GetRescueStatistics
//   POST  /api/v1/rescues/:rescueId/send-email   → RescueService.SendRescueEmail
//   POST  /api/v1/rescues/bulk-update            → RescueService.Verify (per id)
//   POST  /api/v1/rescues/:rescueId/verify       → RescueService.Verify (VERIFIED)
//   POST  /api/v1/rescues/:rescueId/reject       → RescueService.Verify (REJECTED)
//
// The plural /api/v1/rescues/:id/{verify,reject} paths are what the admin
// SPA calls (the existing singular /api/v1/rescue/:id/verify in rescue.ts
// serves a different caller). Both reuse the one Verify RPC, which drives
// the whole VERIFIED / REJECTED / SUSPENDED lifecycle off `toStatus`.
//
// Authz is enforced at the handlers (admin.security.manage for the
// mutations, rescues.read for analytics); the gateway re-rate-limits and
// threads x-user-* metadata.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  RescueV1,
  type GetRescueStatisticsRequest,
  type SendRescueEmailRequest,
  type UpdateRescuePlanRequest,
  type VerifyRescueRequest,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { rescueToView } from './rescue-view.js';

export type RescueAdminRoutesOptions = {
  client: RescueClient;
};

const RL_READ = { max: 120, timeWindow: '1 minute' } as const;
const RL_WRITE = { max: 30, timeWindow: '1 minute' } as const;

// Bulk action → target lifecycle status. 'approve' and 'verify' are the
// same transition; 'suspend' parks the rescue.
const BULK_ACTION_STATUS: Record<string, RescueV1.RescueStatus> = {
  approve: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
  verify: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
  suspend: RescueV1.RescueStatus.RESCUE_STATUS_SUSPENDED,
};

export const registerRescueAdminRoutes = async (
  app: FastifyInstance,
  opts: RescueAdminRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  // PATCH /api/v1/admin/rescues/:rescueId/plan
  app.patch<{
    Params: { rescueId: string };
    Body: { plan?: string; planExpiresAt?: string | null };
  }>(
    '/api/v1/admin/rescues/:rescueId/plan',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: "Update a rescue's subscription plan" },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      if (body.plan === undefined || body.plan === '') {
        return reply.code(400).send({ success: false, error: 'plan is required' });
      }
      const grpcReq: UpdateRescuePlanRequest = {
        rescueId: req.params.rescueId,
        plan: body.plan,
        planExpiresAt: body.planExpiresAt ?? undefined,
      };
      try {
        const res = await client.updateRescuePlan(grpcReq, buildMetadata(req));
        if (res.rescue === undefined) {
          return reply.code(500).send({ success: false, error: 'plan update returned no rescue' });
        }
        return reply.send({
          success: true,
          message: 'Rescue plan updated',
          data: rescueToView(res.rescue),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/rescues/:rescueId/analytics
  app.get<{ Params: { rescueId: string } }>(
    '/api/v1/rescues/:rescueId/analytics',
    {
      config: { rateLimit: RL_READ },
      schema: { tags: ['rescues'], summary: 'Get a rescue headline statistics' },
    },
    async (req, reply) => {
      const grpcReq: GetRescueStatisticsRequest = { rescueId: req.params.rescueId };
      try {
        const res = await client.getRescueStatistics(grpcReq, buildMetadata(req));
        if (res.statistics === undefined) {
          return reply
            .code(500)
            .send({ success: false, error: 'analytics returned no statistics' });
        }
        return reply.send({ success: true, data: res.statistics });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/rescues/:rescueId/send-email
  app.post<{
    Params: { rescueId: string };
    Body: { templateId?: string; subject?: string; body?: string };
  }>(
    '/api/v1/rescues/:rescueId/send-email',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Send an admin email to a rescue' },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      const hasTemplate = body.templateId !== undefined && body.templateId !== '';
      const hasCustom = body.subject !== undefined && body.subject !== '';
      if (!hasTemplate && !hasCustom) {
        return reply.code(400).send({ success: false, error: 'templateId or subject is required' });
      }
      const grpcReq: SendRescueEmailRequest = {
        rescueId: req.params.rescueId,
        templateId: body.templateId,
        subject: body.subject,
        body: body.body,
      };
      try {
        await client.sendRescueEmail(grpcReq, buildMetadata(req));
        return reply.send({ success: true, message: 'Email queued' });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/rescues/bulk-update
  app.post<{ Body: { rescueIds?: string[]; action?: string; reason?: string } }>(
    '/api/v1/rescues/bulk-update',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Bulk approve / suspend / verify rescues' },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      const ids = body.rescueIds ?? [];
      if (ids.length === 0) {
        return reply.code(400).send({ success: false, error: 'rescueIds is required' });
      }
      const toStatus = body.action ? BULK_ACTION_STATUS[body.action] : undefined;
      if (toStatus === undefined) {
        return reply
          .code(400)
          .send({ success: false, error: 'action must be approve, suspend or verify' });
      }
      const metadata = buildMetadata(req);
      const verificationSource =
        toStatus === RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED
          ? RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL
          : undefined;

      const results = await Promise.all(
        ids.map(rescueId =>
          client
            .verify({ rescueId, toStatus, verificationSource }, metadata)
            .then(() => true)
            .catch(() => false)
        )
      );
      const successCount = results.filter(Boolean).length;
      return reply.send({
        success: true,
        message: `Updated ${successCount} of ${ids.length} rescues`,
        data: { successCount, failedCount: ids.length - successCount },
      });
    }
  );

  // POST /api/v1/rescues/:rescueId/verify
  app.post<{ Params: { rescueId: string } }>(
    '/api/v1/rescues/:rescueId/verify',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Verify a rescue' },
    },
    async (req, reply) => {
      const grpcReq: VerifyRescueRequest = {
        rescueId: req.params.rescueId,
        toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
        verificationSource: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
      };
      try {
        const res = await client.verify(grpcReq, buildMetadata(req));
        if (res.rescue === undefined) {
          return reply.code(500).send({ success: false, error: 'verify returned no rescue' });
        }
        return reply.send({
          success: true,
          message: 'Rescue verified',
          data: rescueToView(res.rescue),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/rescues/:rescueId/reject
  app.post<{ Params: { rescueId: string }; Body: { reason?: string } }>(
    '/api/v1/rescues/:rescueId/reject',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Reject a rescue' },
    },
    async (req, reply) => {
      const reason = req.body?.reason;
      if (reason === undefined || reason === '') {
        return reply.code(400).send({ success: false, error: 'reason is required' });
      }
      const grpcReq: VerifyRescueRequest = {
        rescueId: req.params.rescueId,
        toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
        failureReason: reason,
      };
      try {
        const res = await client.verify(grpcReq, buildMetadata(req));
        if (res.rescue === undefined) {
          return reply.code(500).send({ success: false, error: 'reject returned no rescue' });
        }
        return reply.send({
          success: true,
          message: 'Rescue rejected',
          data: rescueToView(res.rescue),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
