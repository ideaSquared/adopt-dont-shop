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
//   GET   /api/v1/rescues/:rescueId/staff        → RescueService.ListStaffMembers
//   DELETE …/staff/:userId                       → RescueService.RemoveStaffMember
//   GET   /api/v1/rescues/:rescueId/invitations  → RescueService.ListRescueInvitations
//   POST  /api/v1/rescues/:rescueId/invitations  → RescueService.InviteStaff
//   DELETE …/invitations/:invitationId           → RescueService.CancelRescueInvitation
//
// The plural /api/v1/rescues/:id/{verify,reject} paths are what the admin
// SPA calls (the existing singular /api/v1/rescue/:id/verify in rescue.ts
// serves a different caller). Both reuse the one Verify RPC, which drives
// the whole VERIFIED / REJECTED / SUSPENDED lifecycle off `toStatus`.
//
// Authz is enforced at the handlers (admin.security.manage for the
// mutations, rescues.read for analytics); the gateway re-rate-limits and
// threads x-user-* metadata.
//
// The StaffTab cards show each member's name + email, which live in
// auth.users (the rescue StaffMember message carries only rescue-owned
// columns). The GET /staff route enriches each member via the auth client
// (parallel AdminGetUser — staff lists are small); a failed/absent lookup
// degrades to empty name fields rather than failing the whole list.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  type AuthV1,
  RescueV1,
  type GetRescueStatisticsRequest,
  type InviteStaffRequest,
  type ListRescueInvitationsRequest,
  type ListStaffMembersRequest,
  type SendRescueEmailRequest,
  type UpdateRescuePlanRequest,
  type VerifyRescueRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { rescueToView } from './rescue-view.js';

export type RescueAdminRoutesOptions = {
  client: RescueClient;
  // Optional — used only to enrich staff members with name/email. When
  // absent (or a lookup fails) those fields come back empty.
  authClient?: AuthClient;
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

// proto StaffMember + (optional) auth user → the SPA's StaffMember shape.
// firstName/lastName/email live in auth.users; empty when not enriched.
const staffMemberToView = (
  member: RescueV1.StaffMember,
  user?: AuthV1.User | undefined
): Record<string, unknown> => ({
  staffMemberId: member.staffMemberId,
  userId: member.userId,
  rescueId: member.rescueId,
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  email: user?.email ?? '',
  title: member.title,
  isVerified: member.isVerified,
  addedAt: member.addedAt,
  addedBy: member.addedBy,
});

// proto Invitation → the SPA's StaffInvitation shape. Only pending (used =
// false) rows are listed, so status is 'pending' unless the TTL lapsed.
// The plain-text token is never surfaced here.
const invitationToView = (inv: RescueV1.Invitation): Record<string, unknown> => {
  const expired = Date.parse(inv.expiration) <= Date.now();
  return {
    invitationId: inv.invitationId,
    rescueId: inv.rescueId,
    email: inv.email,
    title: inv.title,
    status: expired ? 'expired' : 'pending',
    invitedBy: inv.invitedBy,
    createdAt: inv.createdAt,
    expiresAt: inv.expiration,
  };
};

export const registerRescueAdminRoutes = async (
  app: FastifyInstance,
  opts: RescueAdminRoutesOptions
): Promise<void> => {
  const { client, authClient } = opts;

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

  // GET /api/v1/rescues/:rescueId/staff — staff list, name/email enriched.
  app.get<{ Params: { rescueId: string } }>(
    '/api/v1/rescues/:rescueId/staff',
    {
      config: { rateLimit: RL_READ },
      schema: { tags: ['rescues'], summary: 'List a rescue staff members (admin)' },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const grpcReq: ListStaffMembersRequest = { rescueId: req.params.rescueId };
      try {
        const res = await client.listStaffMembers(grpcReq, metadata);
        const members = res.staffMembers;
        // Enrich each member with name/email from auth.users. Lookups run
        // in parallel and degrade to empty fields on failure so a single
        // missing user never fails the whole list.
        const users = authClient
          ? await Promise.all(
              members.map(m =>
                authClient
                  .adminGetUser({ userId: m.userId }, metadata)
                  .then(r => r.user)
                  .catch(() => undefined)
              )
            )
          : members.map(() => undefined);
        const data = members.map((m, i) => staffMemberToView(m, users[i]));
        return reply.send({
          success: true,
          data,
          pagination: {
            page: 1,
            limit: data.length,
            total: data.length,
            totalPages: 1,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/rescues/:rescueId/staff/:userId
  app.delete<{ Params: { rescueId: string; userId: string } }>(
    '/api/v1/rescues/:rescueId/staff/:userId',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Remove a staff member from a rescue (admin)' },
    },
    async (req, reply) => {
      try {
        await client.removeStaffMember(
          { rescueId: req.params.rescueId, userId: req.params.userId },
          buildMetadata(req)
        );
        return reply.send({ success: true, message: 'Staff member removed' });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/rescues/:rescueId/invitations — pending invitations.
  app.get<{ Params: { rescueId: string } }>(
    '/api/v1/rescues/:rescueId/invitations',
    {
      config: { rateLimit: RL_READ },
      schema: { tags: ['rescues'], summary: 'List a rescue pending staff invitations (admin)' },
    },
    async (req, reply) => {
      const grpcReq: ListRescueInvitationsRequest = { rescueId: req.params.rescueId };
      try {
        const res = await client.listRescueInvitations(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: res.invitations.map(invitationToView) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/rescues/:rescueId/invitations — invite a staff member.
  app.post<{ Params: { rescueId: string }; Body: { email?: string; title?: string } }>(
    '/api/v1/rescues/:rescueId/invitations',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Invite a staff member to a rescue (admin)' },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      if (body.email === undefined || body.email === '') {
        return reply.code(400).send({ success: false, error: 'email is required' });
      }
      const grpcReq: InviteStaffRequest = {
        rescueId: req.params.rescueId,
        email: body.email,
        title: body.title,
      };
      try {
        const res = await client.inviteStaff(grpcReq, buildMetadata(req));
        if (res.invitation === undefined) {
          return reply.code(500).send({ success: false, error: 'invite returned no invitation' });
        }
        return reply.code(201).send({
          success: true,
          message: 'Invitation sent',
          data: invitationToView(res.invitation),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/rescues/:rescueId/invitations/:invitationId
  app.delete<{ Params: { rescueId: string; invitationId: string } }>(
    '/api/v1/rescues/:rescueId/invitations/:invitationId',
    {
      config: { rateLimit: RL_WRITE },
      schema: { tags: ['rescues'], summary: 'Cancel a pending staff invitation (admin)' },
    },
    async (req, reply) => {
      try {
        await client.cancelRescueInvitation(
          { rescueId: req.params.rescueId, invitationId: req.params.invitationId },
          buildMetadata(req)
        );
        return reply.send({ success: true, message: 'Invitation cancelled' });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
