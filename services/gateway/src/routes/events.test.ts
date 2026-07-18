import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerEventRoutes } from './events.js';

const MOCK_EVENT = {
  id: 'evt-1',
  rescueId: 'rsc-1',
  name: 'Adoption Day',
  description: 'Come meet our animals',
  type: 2, // EVENT_TYPE_ADOPTION
  startDate: '2026-08-01T10:00:00Z',
  endDate: '2026-08-01T16:00:00Z',
  location: undefined,
  capacity: 50,
  registrationRequired: true,
  status: 1, // EVENT_STATUS_DRAFT
  featuredPets: [],
  assignedStaff: [],
  isPublic: true,
  imageUrl: undefined,
  currentAttendance: 0,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  createdBy: 'usr-1',
};

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

const MOCK_ATTENDEE = {
  eventId: 'evt-1',
  userId: VALID_UUID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  checkedIn: false,
  notes: undefined,
};

function makeClient() {
  const createEventMock = vi.fn().mockResolvedValue({ event: MOCK_EVENT });
  const updateEventMock = vi.fn().mockResolvedValue({ event: MOCK_EVENT });
  const deleteEventMock = vi.fn().mockResolvedValue({});
  const listEventsMock = vi.fn().mockResolvedValue({ events: [] });
  const getEventMock = vi.fn().mockResolvedValue({ event: MOCK_EVENT });
  const getEventAttendeesMock = vi.fn().mockResolvedValue({ attendees: [] });
  const addEventAttendeeMock = vi.fn().mockResolvedValue({ attendee: MOCK_ATTENDEE });
  const checkInAttendeeMock = vi.fn().mockResolvedValue({ attendee: MOCK_ATTENDEE });
  const getEventAnalyticsMock = vi.fn().mockResolvedValue({ analytics: {} });

  const client: RescueClient = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    updateRescuePlan: vi.fn(),
    getRescueStatistics: vi.fn(),
    countRescues: vi.fn(),
    sendRescueEmail: vi.fn(),
    verify: vi.fn(),
    inviteStaff: vi.fn(),
    getMyStaffMembership: vi.fn(),
    listStaffMembers: vi.fn(),
    removeStaffMember: vi.fn(),
    listRescueInvitations: vi.fn(),
    cancelRescueInvitation: vi.fn(),
    createFosterPlacement: vi.fn(),
    listFosterPlacements: vi.fn(),
    getFosterPlacement: vi.fn(),
    endFosterPlacement: vi.fn(),
    getInvitationByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    listApplicationQuestions: vi.fn(),
    createApplicationQuestion: vi.fn(),
    deleteApplicationQuestion: vi.fn(),
    listEvents: listEventsMock,
    getEvent: getEventMock,
    createEvent: createEventMock,
    updateEvent: updateEventMock,
    deleteEvent: deleteEventMock,
    getEventAttendees: getEventAttendeesMock,
    addEventAttendee: addEventAttendeeMock,
    checkInAttendee: checkInAttendeeMock,
    getEventAnalytics: getEventAnalyticsMock,
    close: vi.fn(),
  };

  return {
    client,
    createEventMock,
    updateEventMock,
    addEventAttendeeMock,
  };
}

async function makeApp(client: RescueClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerEventRoutes(app, { client });
  return app;
}

// ─── POST /api/v1/events ─────────────────────────────────────────────────────

describe('POST /api/v1/events', () => {
  it('creates an event with camelCase body and returns 201', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Adoption Day',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          type: 'adoption',
          capacity: 50,
          registrationRequired: true,
          featuredPets: [],
          assignedStaff: [],
          isPublic: true,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ success: true });
      expect(createEventMock).toHaveBeenCalledOnce();
      expect(createEventMock.mock.calls[0][0]).toMatchObject({
        name: 'Adoption Day',
        startDate: '2026-08-01T10:00:00Z',
        endDate: '2026-08-01T16:00:00Z',
        capacity: 50,
        registrationRequired: true,
        isPublic: true,
      });
    } finally {
      await app.close();
    }
  });

  it('accepts snake_case aliases and resolves them to the same canonical fields', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Foster Fair',
          start_date: '2026-09-01T09:00:00Z',
          end_date: '2026-09-01T15:00:00Z',
          registration_required: false,
          featured_pets: [],
          assigned_staff: [],
          is_public: false,
          image_url: '/uploads/events/img.png',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(createEventMock).toHaveBeenCalledOnce();
      const grpcArg = createEventMock.mock.calls[0][0];
      expect(grpcArg.startDate).toBe('2026-09-01T09:00:00Z');
      expect(grpcArg.endDate).toBe('2026-09-01T15:00:00Z');
      expect(grpcArg.registrationRequired).toBe(false);
      expect(grpcArg.isPublic).toBe(false);
      expect(grpcArg.imageUrl).toBe('/uploads/events/img.png');
    } finally {
      await app.close();
    }
  });

  // ADS-979: imageUrl/virtualLink previously accepted any string up to
  // 2048 chars, including javascript:/data: schemes. They now run through
  // the same URL-boundary validation ADS-930 added for document URLs.
  it('rejects a javascript: imageUrl with 400 and does not call gRPC', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          imageUrl: 'javascript:alert(1)',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects a javascript: virtualLink with 400 and does not call gRPC', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          location: { type: 'virtual', virtualLink: "javascript:fetch('https://x/y')" },
        },
      });
      expect(res.statusCode).toBe(400);
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects a plain http:// imageUrl on an allowlisted host with 400 (https only)', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          imageUrl: 'http://cdn.example.com/img.png',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects an imageUrl on a non-allowlisted https host with 400', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          imageUrl: 'https://attacker.example/img.png',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('accepts a same-origin relative imageUrl', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          imageUrl: '/uploads/events/foo.jpg',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(createEventMock).toHaveBeenCalledOnce();
      expect(createEventMock.mock.calls[0][0].imageUrl).toBe('/uploads/events/foo.jpg');
    } finally {
      await app.close();
    }
  });

  it('accepts an https:// virtualLink to a third-party meeting host (not restricted to the storage allowlist)', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          location: { type: 'virtual', virtualLink: 'https://zoom.us/j/123456789' },
        },
      });
      expect(res.statusCode).toBe(201);
      expect(createEventMock).toHaveBeenCalledOnce();
      expect(createEventMock.mock.calls[0][0].location.virtualLink).toBe(
        'https://zoom.us/j/123456789'
      );
    } finally {
      await app.close();
    }
  });

  it('rejects a missing name with 400 and does not call gRPC', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects a non-integer capacity with 400', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          capacity: 'twenty',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects an invalid event type enum with 400', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          type: 'party',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects a non-uuid in featuredPets with 400', async () => {
    const { client, createEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events',
        payload: {
          name: 'Test',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-01T16:00:00Z',
          featuredPets: ['not-a-uuid'],
        },
      });
      expect(res.statusCode).toBe(400);
      expect(createEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

// ─── PUT /api/v1/events/:id ───────────────────────────────────────────────────

describe('PUT /api/v1/events/:id', () => {
  it('updates an event with camelCase body and returns 200', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/events/evt-1',
        payload: {
          name: 'Updated Name',
          startDate: '2026-08-02T10:00:00Z',
          endDate: '2026-08-02T16:00:00Z',
          isPublic: false,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true });
      expect(updateEventMock).toHaveBeenCalledOnce();
      expect(updateEventMock.mock.calls[0][0]).toMatchObject({
        id: 'evt-1',
        name: 'Updated Name',
        startDate: '2026-08-02T10:00:00Z',
        isPublic: false,
      });
    } finally {
      await app.close();
    }
  });

  it('accepts snake_case aliases in PUT body', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/events/evt-1',
        payload: {
          name: 'Snake Update',
          start_date: '2026-08-03T10:00:00Z',
          end_date: '2026-08-03T16:00:00Z',
          assigned_staff: [],
          featured_pets: [],
          registration_required: true,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(updateEventMock).toHaveBeenCalledOnce();
      const grpcArg = updateEventMock.mock.calls[0][0];
      expect(grpcArg.startDate).toBe('2026-08-03T10:00:00Z');
      expect(grpcArg.endDate).toBe('2026-08-03T16:00:00Z');
      expect(grpcArg.registrationRequired).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('rejects an invalid capacity type with 400 and does not call gRPC', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/events/evt-1',
        payload: { capacity: 'lots' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(updateEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects an invalid status enum in PUT body with 400', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/events/evt-1',
        payload: { status: 'unknown_status' },
      });
      expect(res.statusCode).toBe(400);
      expect(updateEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

// ─── PATCH /api/v1/events/:id/status ─────────────────────────────────────────

describe('PATCH /api/v1/events/:id/status', () => {
  it('updates status with a valid enum value and returns 200', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/events/evt-1/status',
        payload: { status: 'published' },
      });
      expect(res.statusCode).toBe(200);
      expect(updateEventMock).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it('rejects a missing status field with 400', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/events/evt-1/status',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(updateEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects an invalid status value with 400', async () => {
    const { client, updateEventMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/events/evt-1/status',
        payload: { status: 'active' },
      });
      expect(res.statusCode).toBe(400);
      expect(updateEventMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

// ─── POST /api/v1/events/:id/attendees ───────────────────────────────────────

describe('POST /api/v1/events/:id/attendees', () => {
  it('registers an attendee with valid camelCase body and returns 201', async () => {
    const { client, addEventAttendeeMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events/evt-1/attendees',
        payload: {
          userId: VALID_UUID,
          name: 'Jane Doe',
          email: 'jane@example.com',
          notes: 'Allergic to cats',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(addEventAttendeeMock).toHaveBeenCalledOnce();
      expect(addEventAttendeeMock.mock.calls[0][0]).toMatchObject({
        eventId: 'evt-1',
        userId: VALID_UUID,
        name: 'Jane Doe',
        email: 'jane@example.com',
        notes: 'Allergic to cats',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects a non-UUID userId with 400', async () => {
    const { client, addEventAttendeeMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events/evt-1/attendees',
        payload: {
          userId: 'not-a-uuid',
          name: 'Jane',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(addEventAttendeeMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects an invalid email with 400', async () => {
    const { client, addEventAttendeeMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events/evt-1/attendees',
        payload: {
          userId: VALID_UUID,
          name: 'Jane',
          email: 'not-an-email',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'Invalid request body' });
      expect(addEventAttendeeMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects a missing required field with 400', async () => {
    const { client, addEventAttendeeMock } = makeClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/events/evt-1/attendees',
        payload: {
          userId: VALID_UUID,
          email: 'jane@example.com',
          // name is missing
        },
      });
      expect(res.statusCode).toBe(400);
      expect(addEventAttendeeMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
