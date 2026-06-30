// REST → gRPC translation for event RPCs in service.rescue.
// Serves /api/v1/events/* — CRUD + attendee management + analytics.
//
// Registers when the rescue service client is wired. Responses use
// camelCase fields that the rescue SPA's eventsService.ts expects.

import type { FastifyInstance } from 'fastify';

import { RescueV1, type CreateEventRequest, type UpdateEventRequest } from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type EventRoutesOptions = {
  client: RescueClient;
};

const eventTypeFromString = (raw: string | undefined): RescueV1.EventType => {
  switch (raw?.toLowerCase()) {
    case 'adoption':
      return RescueV1.EventType.EVENT_TYPE_ADOPTION;
    case 'fundraising':
      return RescueV1.EventType.EVENT_TYPE_FUNDRAISING;
    case 'volunteer':
      return RescueV1.EventType.EVENT_TYPE_VOLUNTEER;
    case 'community':
      return RescueV1.EventType.EVENT_TYPE_COMMUNITY;
    default:
      return RescueV1.EventType.EVENT_TYPE_UNSPECIFIED;
  }
};

const eventTypeToString = (t: RescueV1.EventType): string => {
  switch (t) {
    case RescueV1.EventType.EVENT_TYPE_ADOPTION:
      return 'adoption';
    case RescueV1.EventType.EVENT_TYPE_FUNDRAISING:
      return 'fundraising';
    case RescueV1.EventType.EVENT_TYPE_VOLUNTEER:
      return 'volunteer';
    case RescueV1.EventType.EVENT_TYPE_COMMUNITY:
      return 'community';
    default:
      return 'community';
  }
};

const eventStatusFromString = (raw: string | undefined): RescueV1.EventStatus => {
  switch (raw?.toLowerCase()) {
    case 'draft':
      return RescueV1.EventStatus.EVENT_STATUS_DRAFT;
    case 'published':
      return RescueV1.EventStatus.EVENT_STATUS_PUBLISHED;
    case 'in_progress':
      return RescueV1.EventStatus.EVENT_STATUS_IN_PROGRESS;
    case 'completed':
      return RescueV1.EventStatus.EVENT_STATUS_COMPLETED;
    case 'cancelled':
      return RescueV1.EventStatus.EVENT_STATUS_CANCELLED;
    default:
      return RescueV1.EventStatus.EVENT_STATUS_UNSPECIFIED;
  }
};

const eventStatusToString = (s: RescueV1.EventStatus): string => {
  switch (s) {
    case RescueV1.EventStatus.EVENT_STATUS_DRAFT:
      return 'draft';
    case RescueV1.EventStatus.EVENT_STATUS_PUBLISHED:
      return 'published';
    case RescueV1.EventStatus.EVENT_STATUS_IN_PROGRESS:
      return 'in_progress';
    case RescueV1.EventStatus.EVENT_STATUS_COMPLETED:
      return 'completed';
    case RescueV1.EventStatus.EVENT_STATUS_CANCELLED:
      return 'cancelled';
    default:
      return 'draft';
  }
};

// Shape a proto RescueEvent into the camelCase JSON the SPA expects.
// The SPA's transformEvent also handles snake_case fallbacks but we use
// camelCase throughout to keep the gateway contract consistent.
const shapeEvent = (event: RescueV1.RescueEvent | undefined) => {
  if (!event) {
    return undefined;
  }
  return {
    id: event.id,
    rescueId: event.rescueId,
    name: event.name,
    description: event.description,
    type: eventTypeToString(event.type),
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    capacity: event.capacity,
    registrationRequired: event.registrationRequired,
    status: eventStatusToString(event.status),
    featuredPets: event.featuredPets,
    assignedStaff: event.assignedStaff,
    isPublic: event.isPublic,
    imageUrl: event.imageUrl,
    currentAttendance: event.currentAttendance,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    createdBy: event.createdBy,
  };
};

export const registerEventRoutes = async (
  app: FastifyInstance,
  opts: EventRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // ---- GET /api/v1/events ------------------------------------------
  app.get(
    '/api/v1/events',
    {
      schema: {
        tags: ['events'],
        summary: 'List events for the current rescue',
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      try {
        const res = await client.listEvents(
          {
            type: query.type,
            status: query.status,
            startDate: query.startDate,
            endDate: query.endDate,
            search: query.search,
            assignedStaff: query.assignedStaff,
            isPublic:
              query.isPublic === 'true' ? true : query.isPublic === 'false' ? false : undefined,
          },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: (res.events ?? []).map(shapeEvent) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/events/:id --------------------------------------
  app.get<{ Params: { id: string } }>(
    '/api/v1/events/:id',
    {
      schema: {
        tags: ['events'],
        summary: 'Get a single event by ID',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getEvent({ id: req.params.id }, buildMetadata(req));
        return reply.send({ success: true, data: shapeEvent(res.event) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- POST /api/v1/events -----------------------------------------
  app.post(
    '/api/v1/events',
    {
      schema: {
        tags: ['events'],
        summary: 'Create a new event',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        name?: string;
        description?: string;
        type?: string;
        start_date?: string;
        end_date?: string;
        location?: RescueV1.EventLocation;
        capacity?: number;
        registration_required?: boolean;
        featured_pets?: string[];
        assigned_staff?: string[];
        is_public?: boolean;
        image_url?: string;
      };
      const grpcReq: CreateEventRequest = {
        name: body.name ?? '',
        description: body.description ?? '',
        type: eventTypeFromString(body.type),
        startDate: body.start_date ?? '',
        endDate: body.end_date ?? '',
        location: body.location,
        capacity: body.capacity,
        registrationRequired: body.registration_required ?? false,
        featuredPets: body.featured_pets ?? [],
        assignedStaff: body.assigned_staff ?? [],
        isPublic: body.is_public ?? true,
        imageUrl: body.image_url,
      };
      try {
        const res = await client.createEvent(grpcReq, buildMetadata(req));
        return reply.code(201).send({ success: true, data: shapeEvent(res.event) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- PUT /api/v1/events/:id --------------------------------------
  app.put<{ Params: { id: string } }>(
    '/api/v1/events/:id',
    {
      schema: {
        tags: ['events'],
        summary: 'Update an existing event',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        name?: string;
        description?: string;
        type?: string;
        start_date?: string;
        end_date?: string;
        location?: RescueV1.EventLocation;
        capacity?: number;
        registration_required?: boolean;
        featured_pets?: string[];
        assigned_staff?: string[];
        is_public?: boolean;
        image_url?: string;
        status?: string;
      };
      const grpcReq: UpdateEventRequest = {
        id: req.params.id,
        name: body.name,
        description: body.description,
        type: body.type !== undefined ? eventTypeFromString(body.type) : undefined,
        startDate: body.start_date,
        endDate: body.end_date,
        location: body.location,
        capacity: body.capacity,
        registrationRequired: body.registration_required,
        featuredPets: body.featured_pets ?? [],
        hasFeaturedPets: body.featured_pets !== undefined,
        assignedStaff: body.assigned_staff ?? [],
        hasAssignedStaff: body.assigned_staff !== undefined,
        isPublic: body.is_public,
        imageUrl: body.image_url,
        status: body.status !== undefined ? eventStatusFromString(body.status) : undefined,
      };
      try {
        const res = await client.updateEvent(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: shapeEvent(res.event) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- DELETE /api/v1/events/:id -----------------------------------
  app.delete<{ Params: { id: string } }>(
    '/api/v1/events/:id',
    {
      schema: {
        tags: ['events'],
        summary: 'Delete an event (soft-delete)',
      },
    },
    async (req, reply) => {
      try {
        await client.deleteEvent({ id: req.params.id }, buildMetadata(req));
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- PATCH /api/v1/events/:id/status ----------------------------
  app.patch<{ Params: { id: string } }>(
    '/api/v1/events/:id/status',
    {
      schema: {
        tags: ['events'],
        summary: 'Update event status',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as { status?: string };
      const grpcReq: UpdateEventRequest = {
        id: req.params.id,
        featuredPets: [],
        hasFeaturedPets: false,
        assignedStaff: [],
        hasAssignedStaff: false,
        status: eventStatusFromString(body.status),
      };
      try {
        const res = await client.updateEvent(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: shapeEvent(res.event) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/events/:id/attendees ----------------------------
  app.get<{ Params: { id: string } }>(
    '/api/v1/events/:id/attendees',
    {
      schema: {
        tags: ['events'],
        summary: 'List attendees for an event',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getEventAttendees({ eventId: req.params.id }, buildMetadata(req));
        return reply.send({ success: true, data: res.attendees ?? [] });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- POST /api/v1/events/:id/attendees ---------------------------
  app.post<{ Params: { id: string } }>(
    '/api/v1/events/:id/attendees',
    {
      schema: {
        tags: ['events'],
        summary: 'Register an attendee for an event',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        userId?: string;
        name?: string;
        email?: string;
        notes?: string;
      };
      try {
        const res = await client.addEventAttendee(
          {
            eventId: req.params.id,
            userId: body.userId ?? '',
            name: body.name ?? '',
            email: body.email ?? '',
            notes: body.notes,
          },
          buildMetadata(req)
        );
        return reply.code(201).send({ success: true, data: res.attendee });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- PATCH /api/v1/events/:id/attendees/:userId/check-in --------
  app.patch<{ Params: { id: string; userId: string } }>(
    '/api/v1/events/:id/attendees/:userId/check-in',
    {
      schema: {
        tags: ['events'],
        summary: 'Check in an attendee at an event',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.checkInAttendee(
          { eventId: req.params.id, userId: req.params.userId },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: res.attendee });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET /api/v1/events/:id/analytics ---------------------------
  app.get<{ Params: { id: string } }>(
    '/api/v1/events/:id/analytics',
    {
      schema: {
        tags: ['events'],
        summary: 'Get analytics for an event',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getEventAnalytics({ eventId: req.params.id }, buildMetadata(req));
        return reply.send({ success: true, data: res.analytics });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
