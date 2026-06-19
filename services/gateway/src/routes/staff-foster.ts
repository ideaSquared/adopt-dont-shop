// REST → gRPC translation for the rescue service's staff / foster /
// invitation-read surface. Ports the monolith's /api/v1/staff/*,
// /api/v1/foster/* and GET /api/v1/invitations/details/:token.
//
// Mounted under the rescue cutover flag. Responses use the monolith's
// `{ success, data }` envelope so the SPA (lib.rescue, staff views)
// doesn't notice the cutover.

import type { FastifyInstance } from 'fastify';

import {
  RescueV1,
  type CreateFosterPlacementRequest,
  type EndFosterPlacementRequest,
  type ListFosterPlacementsRequest,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type StaffFosterRoutesOptions = {
  client: RescueClient;
};

const fosterStatusFromString = (raw: string | undefined): RescueV1.FosterPlacementStatus => {
  switch (raw?.toLowerCase()) {
    case 'active':
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE;
    case 'completed':
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_COMPLETED;
    case 'cancelled':
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_CANCELLED;
    default:
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_UNSPECIFIED;
  }
};

const endOutcomeFromString = (raw: string | undefined): RescueV1.FosterEndOutcome => {
  switch (raw) {
    case 'return_to_rescue':
      return RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_RETURN_TO_RESCUE;
    case 'adopted_by_foster':
      return RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_ADOPTED_BY_FOSTER;
    case 'cancelled':
      return RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_CANCELLED;
    default:
      return RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_UNSPECIFIED;
  }
};

export const registerStaffFosterRoutes = async (
  app: FastifyInstance,
  opts: StaffFosterRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // ---- GET /api/v1/staff/me ----------------------------------------
  app.get(
    '/api/v1/staff/me',
    {
      schema: {
        tags: ['staff'],
        summary: 'Get current user staff membership',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getMyStaffMembership({}, buildMetadata(req));
        return reply.send({ success: true, data: res.staffMember });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/staff/colleagues --------------------------------
  app.get(
    '/api/v1/staff/colleagues',
    {
      schema: {
        tags: ['staff'],
        summary: 'List staff colleagues within the current rescue',
      },
    },
    async (req, reply) => {
      try {
        // Empty rescue_id → service resolves the caller's own rescue.
        const res = await client.listStaffMembers({ rescueId: undefined }, buildMetadata(req));
        return reply.send({ success: true, data: res.staffMembers ?? [] });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- POST /api/v1/foster/placements ------------------------------
  app.post(
    '/api/v1/foster/placements',
    {
      schema: {
        tags: ['foster'],
        summary: 'Create a foster placement',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        rescueId?: string;
        petId?: string;
        fosterUserId?: string;
        startDate?: string;
        notes?: string;
      };
      const grpcReq: CreateFosterPlacementRequest = {
        rescueId: body.rescueId ?? '',
        petId: body.petId ?? '',
        fosterUserId: body.fosterUserId ?? '',
        startDate: body.startDate ?? '',
        notes: body.notes,
      };
      try {
        const res = await client.createFosterPlacement(grpcReq, buildMetadata(req));
        return reply.code(201).send({ success: true, data: res.placement });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/foster/placements -------------------------------
  app.get(
    '/api/v1/foster/placements',
    {
      schema: {
        tags: ['foster'],
        summary: 'List foster placements',
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const grpcReq: ListFosterPlacementsRequest = {
        rescueId: query.rescueId,
        fosterUserId: query.fosterUserId,
        statusFilter: fosterStatusFromString(query.status),
      };
      try {
        const res = await client.listFosterPlacements(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: res.placements ?? [] });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/foster/placements/:id ---------------------------
  app.get<{ Params: { id: string } }>(
    '/api/v1/foster/placements/:id',
    {
      schema: {
        tags: ['foster'],
        summary: 'Get a foster placement by ID',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getFosterPlacement(
          { placementId: req.params.id },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: res.placement });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- POST /api/v1/foster/placements/:id/end ----------------------
  app.post<{ Params: { id: string } }>(
    '/api/v1/foster/placements/:id/end',
    {
      schema: {
        tags: ['foster'],
        summary: 'End a foster placement',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        outcome?: string;
        endDate?: string;
        notes?: string;
      };
      const grpcReq: EndFosterPlacementRequest = {
        placementId: req.params.id,
        outcome: endOutcomeFromString(body.outcome),
        endDate: body.endDate,
        notes: body.notes,
      };
      try {
        const res = await client.endFosterPlacement(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: res.placement });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/invitations/details/:token ----------------------
  // Public — reachable from the email link before the invitee has an
  // account. The token IS the credential.
  app.get<{ Params: { token: string } }>(
    '/api/v1/invitations/details/:token',
    {
      schema: {
        tags: ['staff'],
        summary: 'Get invitation details by token',
        security: [],
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getInvitationByToken(
          { token: req.params.token },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: res.invitation });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------
