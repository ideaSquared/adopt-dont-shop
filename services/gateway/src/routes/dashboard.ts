// REST → gRPC composition for the /api/v1/dashboard/* surface.
//
// This plugin spans three backend services (pets, applications,
// rescue) because the monolith's dashboard endpoint composed counts
// and activity from all three. Each upstream call goes out in
// parallel, fan-in at the gateway, and the response shape mirrors
// the monolith UserController.getRescueDashboard payload so the SPA's
// rescue-app dashboard widget keeps working.
//
// Route map:
//   GET /api/v1/dashboard/rescue   → pets.GetStats + apps.GetStats +
//                                    rescue.ListStaffMembers (count) +
//                                    pets.List + apps.List (recent activity)
//   GET /api/v1/dashboard/activity → pets.List + apps.List (recent N)
//
// Rescue-scoped: the calling principal MUST be rescue staff (rescue_id
// metadata is set). Admins can pass ?rescueId= explicitly to scope
// elsewhere. Adopters get 403.

import { status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  ApplicationsV1,
  PetsV1,
  type GetStatsRequest as ApplicationsGetStatsRequest,
  type GetPetStatsRequest,
  type ListApplicationsRequest,
  type ListPetsRequest,
  type ListStaffMembersRequest,
} from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';

export type DashboardRoutesOptions = {
  petsClient: PetsClient;
  applicationsClient: ApplicationsClient;
  rescueClient: RescueClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

const DEFAULT_ACTIVITY_LIMIT = 10;
const MAX_ACTIVITY_LIMIT = 100;

const parseLimit = (raw: string | undefined): number => {
  if (!raw) {
    return DEFAULT_ACTIVITY_LIMIT;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) {
    return DEFAULT_ACTIVITY_LIMIT;
  }
  return Math.min(n, MAX_ACTIVITY_LIMIT);
};

// Pull the caller's rescue scope from the principal headers. We don't
// look it up via getMyStaffMembership for the simple cases — the
// gateway's authenticate middleware has already populated x-rescue-id
// when the principal is rescue staff. Admins can override via
// ?rescueId= in the query string.
const resolveRescueScope = (req: FastifyRequest): string | null => {
  const query = req.query as Record<string, string | undefined>;
  if (query.rescueId) {
    return query.rescueId;
  }
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const raw = headers['x-rescue-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

// --- Activity item shape ---------------------------------------------

type ActivityItem = {
  id: string;
  type: 'pet_added' | 'application_received';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

const buildPetActivity = (pet: PetsV1.Pet): ActivityItem => ({
  id: `pet_added_${pet.petId}`,
  type: 'pet_added',
  title: 'New Pet Added',
  description: `${pet.name} was added to your rescue`,
  timestamp: pet.createdAt,
  metadata: { petId: pet.petId, petName: pet.name },
});

const buildApplicationActivity = (app: ApplicationsV1.Application): ActivityItem => ({
  id: `application_received_${app.applicationId}`,
  type: 'application_received',
  title: 'New Application',
  description: 'A new adoption application was received',
  timestamp: app.createdAt,
  metadata: { applicationId: app.applicationId, petId: app.petId },
});

// Merge two ordered lists into one sorted-by-timestamp-desc list,
// capped at limit. Both inputs are already newest-first from their
// upstream List RPCs, so this is a stable interleave.
const mergeAndSort = (
  petActivities: ActivityItem[],
  applicationActivities: ActivityItem[],
  limit: number
): ActivityItem[] =>
  [...petActivities, ...applicationActivities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

export const registerDashboardRoutes = async (
  app: FastifyInstance,
  opts: DashboardRoutesOptions
): Promise<void> => {
  const { petsClient, applicationsClient, rescueClient } = opts;

  // --- GET /api/v1/dashboard/rescue --------------------------------
  app.get('/api/v1/dashboard/rescue', async (req, reply) => {
    const metadata = buildMetadata(req);
    const rescueId = resolveRescueScope(req);

    if (!rescueId) {
      // Mirrors monolith behaviour: no staff association → 400.
      return reply.code(400).send({
        success: false,
        message: 'User is not associated with a rescue organization',
      });
    }

    try {
      // Four parallel upstream calls. The pets recent-listing reuses
      // pets.List with limit=10; the applications recent-listing reuses
      // apps.List the same way. We could ask for fewer fields, but the
      // ListPets / ListApplications shapes are already lean, and one
      // round trip per upstream beats six.
      const petStatsReq: GetPetStatsRequest = { rescueIdFilter: rescueId };
      const appStatsReq: ApplicationsGetStatsRequest = { rescueIdFilter: rescueId };
      const petListReq: ListPetsRequest = {
        rescueIdFilter: rescueId,
        limit: DEFAULT_ACTIVITY_LIMIT,
        statusFilter: PetsV1.PetStatus.PET_STATUS_UNSPECIFIED,
        typeFilter: PetsV1.PetType.PET_TYPE_UNSPECIFIED,
        sizeFilter: PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
      };
      const appListReq: ListApplicationsRequest = {
        rescueIdFilter: rescueId,
        limit: DEFAULT_ACTIVITY_LIMIT,
        statusFilter: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED,
      };
      const staffReq: ListStaffMembersRequest = {
        rescueId,
      };

      const [petStats, appStats, petList, appList, staffList] = await Promise.all([
        petsClient.getStats(petStatsReq, metadata),
        applicationsClient.getStats(appStatsReq, metadata),
        petsClient.list(petListReq, metadata),
        applicationsClient.list(appListReq, metadata),
        rescueClient.listStaffMembers(staffReq, metadata),
      ]);

      const recentActivity = mergeAndSort(
        petList.pets.map(buildPetActivity),
        appList.applications.map(buildApplicationActivity),
        DEFAULT_ACTIVITY_LIMIT
      );

      return reply.send({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          totalAnimals: petStats.total,
          availableForAdoption: petStats.available,
          pendingApplications: appStats.submitted,
          recentAdoptions: petStats.monthlyAdoptions,
          totalApplications: appStats.total,
          adoptedPets: petStats.adopted,
          staffCount: staffList.staffMembers?.length ?? 0,
          averageTimeToAdoption: petStats.averageDaysToAdoption,
          recentActivity,
        },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // --- GET /api/v1/dashboard/activity ------------------------------
  app.get('/api/v1/dashboard/activity', async (req, reply) => {
    const metadata = buildMetadata(req);
    const rescueId = resolveRescueScope(req);
    if (!rescueId) {
      return reply.code(400).send({
        success: false,
        message: 'User is not associated with a rescue organization',
      });
    }

    const query = req.query as Record<string, string | undefined>;
    const limit = parseLimit(query.limit);

    try {
      const petListReq: ListPetsRequest = {
        rescueIdFilter: rescueId,
        limit,
        statusFilter: PetsV1.PetStatus.PET_STATUS_UNSPECIFIED,
        typeFilter: PetsV1.PetType.PET_TYPE_UNSPECIFIED,
        sizeFilter: PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
      };
      const appListReq: ListApplicationsRequest = {
        rescueIdFilter: rescueId,
        limit,
        statusFilter: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED,
      };

      const [petList, appList] = await Promise.all([
        petsClient.list(petListReq, metadata),
        applicationsClient.list(appListReq, metadata),
      ]);

      const activity = mergeAndSort(
        petList.pets.map(buildPetActivity),
        appList.applications.map(buildApplicationActivity),
        limit
      );

      return reply.send({
        success: true,
        message: 'Activity retrieved successfully',
        data: activity,
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
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
