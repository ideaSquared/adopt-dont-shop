// REST → gRPC translation for the user-facing /api/v1/support/* surface.
// Adopters open and reply to their own support tickets here; the admin
// surface lives at /api/v1/admin/support/* (moderation-admin.ts) and
// hits the same gRPC handlers, just with the admin perm at the
// principal layer.
//
// Path map (monolith parity — userSupport.routes.ts):
//   POST /api/v1/support/tickets                          → openSupportTicket
//   GET  /api/v1/support/my-tickets                       → listSupportTickets (self-scoped)
//   GET  /api/v1/support/tickets/:ticketId                → getSupportTicket
//   POST /api/v1/support/tickets/:ticketId/reply          → respondToTicket
//   GET  /api/v1/support/tickets/:ticketId/messages       → getSupportTicket(includeResponses=true)

import { status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  ModerationV1,
  type GetSupportTicketRequest,
  type ListSupportTicketsRequest,
  type OpenSupportTicketRequest,
  type RespondToTicketRequest,
} from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';
import { buildMetadata } from '../middleware/metadata.js';

export type SupportRoutesOptions = {
  client: ModerationClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

const priorityFromString = (raw: string | undefined): ModerationV1.SupportTicketPriority => {
  if (!raw) {
    return ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL;
  }
  const upper = `SUPPORT_TICKET_PRIORITY_${raw.toUpperCase()}`;
  const value = ModerationV1.supportTicketPriorityFromJSON(
    Object.values(ModerationV1.SupportTicketPriority).includes(upper as never) ? upper : raw
  );
  return value === ModerationV1.SupportTicketPriority.UNRECOGNIZED
    ? ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL
    : value;
};

const categoryFromString = (raw: string | undefined): ModerationV1.SupportTicketCategory => {
  if (!raw) {
    return ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED;
  }
  const upper = `SUPPORT_TICKET_CATEGORY_${raw.toUpperCase()}`;
  const value = ModerationV1.supportTicketCategoryFromJSON(
    Object.values(ModerationV1.SupportTicketCategory).includes(upper as never) ? upper : raw
  );
  return value === ModerationV1.SupportTicketCategory.UNRECOGNIZED
    ? ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED
    : value;
};

const statusFromString = (raw: string | undefined): ModerationV1.SupportTicketStatus => {
  if (!raw) {
    return ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED;
  }
  const upper = `SUPPORT_TICKET_STATUS_${raw.toUpperCase()}`;
  const value = ModerationV1.supportTicketStatusFromJSON(
    Object.values(ModerationV1.SupportTicketStatus).includes(upper as never) ? upper : raw
  );
  return value === ModerationV1.SupportTicketStatus.UNRECOGNIZED
    ? ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED
    : value;
};

export const registerSupportRoutes = async (
  app: FastifyInstance,
  opts: SupportRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // ---- POST /api/v1/support/tickets --------------------------------
  // Caller is the ticket owner. The handler reads principal.userId for
  // the row; we still accept user_email + user_name from the body
  // (the monolith sends them — saves a /auth/me round-trip).
  app.post('/api/v1/support/tickets', async (req, reply) => {
    const body = (req.body ?? {}) as {
      subject?: string;
      description?: string;
      category?: string;
      priority?: string;
      userEmail?: string;
      user_email?: string;
      userName?: string;
      user_name?: string;
      tags?: string[];
    };
    const grpcReq: OpenSupportTicketRequest = {
      subject: body.subject ?? '',
      description: body.description ?? '',
      category: categoryFromString(body.category),
      priority: priorityFromString(body.priority),
      userEmail: body.userEmail ?? body.user_email ?? '',
      userName: body.userName ?? body.user_name,
      tags: body.tags ?? [],
    };
    try {
      const res = await client.openSupportTicket(grpcReq, buildMetadata(req));
      return reply.code(201).send({ success: true, data: res.ticket });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- GET /api/v1/support/my-tickets ------------------------------
  // The handler self-scopes for non-admins, so no explicit user_id
  // filter needed.
  app.get('/api/v1/support/my-tickets', async (req, reply) => {
    const query = req.query as Record<string, string | undefined>;
    const grpcReq: ListSupportTicketsRequest = {
      status: statusFromString(query.status),
      // page/limit — the monolith uses page-based; we forward limit
      // only. Page-based pagination over a keyset cursor RPC is left
      // to the SPA (cursor in/out).
      limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
      cursor: query.cursor,
    } as ListSupportTicketsRequest;
    try {
      const res = await client.listSupportTickets(grpcReq, buildMetadata(req));
      return reply.send({
        success: true,
        data: res.tickets ?? [],
        nextCursor: res.nextCursor,
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- GET /api/v1/support/tickets/:ticketId -----------------------
  app.get<{ Params: { ticketId: string } }>(
    '/api/v1/support/tickets/:ticketId',
    async (req, reply) => {
      const grpcReq: GetSupportTicketRequest = {
        ticketId: req.params.ticketId,
        includeResponses: false,
      };
      try {
        const res = await client.getSupportTicket(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: res.ticket });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- POST /api/v1/support/tickets/:ticketId/reply ----------------
  app.post<{ Params: { ticketId: string } }>(
    '/api/v1/support/tickets/:ticketId/reply',
    async (req, reply) => {
      const body = (req.body ?? {}) as { content?: string };
      const grpcReq: RespondToTicketRequest = {
        ticketId: req.params.ticketId,
        content: body.content ?? '',
        // is_internal is admin-only; the handler enforces. We don't
        // even forward it from the user surface.
        isInternal: false,
      };
      try {
        const res = await client.respondToTicket(grpcReq, buildMetadata(req));
        return reply.code(201).send({ success: true, data: res.response });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/support/tickets/:ticketId/messages --------------
  // Same as the GET endpoint above but with the response thread
  // included.
  app.get<{ Params: { ticketId: string } }>(
    '/api/v1/support/tickets/:ticketId/messages',
    async (req, reply) => {
      const grpcReq: GetSupportTicketRequest = {
        ticketId: req.params.ticketId,
        includeResponses: true,
      };
      try {
        const res = await client.getSupportTicket(grpcReq, buildMetadata(req));
        return reply.send({
          success: true,
          data: {
            ticket: res.ticket,
            responses: res.responses ?? [],
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
