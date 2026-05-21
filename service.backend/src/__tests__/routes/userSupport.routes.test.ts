/**
 * Authorization / data-exposure regression tests for the reporter-facing
 * support-ticket endpoints (`/api/v1/support/*`).
 *
 * A ticket reporter must never see internal triage state: internal notes,
 * the identity of the assigned support agent, escalation metadata, due
 * dates, or operational SLA timers. The conversation messages returned to
 * the reporter must also exclude internal staff-only responses.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const mockSupportTicketService = vi.hoisted(() => ({
  getTicketById: vi.fn(),
  getUserTickets: vi.fn(),
  createTicket: vi.fn(),
  addResponse: vi.fn(),
}));

vi.mock('../../services/supportTicket.service', () => ({
  default: mockSupportTicketService,
}));

const mockUser = vi.hoisted(() => ({
  findByPk: vi.fn(),
}));

vi.mock('../../models/User', () => ({
  default: mockUser,
}));

const authenticateTokenMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
}));

import userSupportRouter from '../../routes/userSupport.routes';

const reporterUserId = '11111111-2222-3333-4444-555555555555';
const otherUserId = '99999999-8888-7777-6666-555555555555';
const ticketId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/support', userSupportRouter);
  return app;
};

const reporterPrincipal = {
  userId: reporterUserId,
  email: 'reporter@example.com',
  userType: 'ADOPTER',
  role: 'ADOPTER',
};

// Full ticket including every field a real Sequelize fetch would surface,
// so the sanitizer is exercised against the actual exposure surface.
const buildFullTicket = (overrides: Record<string, unknown> = {}) => ({
  ticketId,
  userId: reporterUserId,
  userEmail: 'reporter@example.com',
  userName: 'Reporter Name',
  subject: 'Something is broken',
  description: 'A long description of the issue.',
  status: 'open',
  priority: 'high',
  category: 'technical_issue',
  tags: ['tag-a'],
  attachments: [],
  createdAt: new Date('2026-05-01T10:00:00Z').toISOString(),
  updatedAt: new Date('2026-05-01T10:00:00Z').toISOString(),
  // The following are staff-internal and must be stripped before reaching
  // the reporter:
  internalNotes: 'SECRET STAFF NOTE: user is suspected of abuse',
  assignedTo: 'agent-uuid-1',
  AssignedAgent: {
    userId: 'agent-uuid-1',
    firstName: 'Staff',
    lastName: 'Agent',
    email: 'agent@internal.example',
  },
  escalatedTo: 'agent-uuid-2',
  escalationReason: 'Customer threatened legal action',
  escalatedAt: new Date('2026-05-02T12:00:00Z').toISOString(),
  metadata: { internalScore: 0.97, riskFlag: 'high' },
  dueDate: new Date('2026-05-05T10:00:00Z').toISOString(),
  estimatedResolutionTime: 48,
  actualResolutionTime: 36,
  Responses: [
    {
      responseId: 'resp-1',
      content: 'Public reply from agent',
      isInternal: false,
      createdAt: new Date('2026-05-01T11:00:00Z').toISOString(),
    },
    {
      responseId: 'resp-2',
      content: 'INTERNAL: please escalate, customer is hostile',
      isInternal: true,
      createdAt: new Date('2026-05-01T11:30:00Z').toISOString(),
    },
  ],
  ...overrides,
});

const REPORTER_FORBIDDEN_FIELDS = [
  'internalNotes',
  'assignedTo',
  'AssignedAgent',
  'escalatedTo',
  'escalationReason',
  'escalatedAt',
  'metadata',
  'dueDate',
  'estimatedResolutionTime',
  'actualResolutionTime',
] as const;

const assertNoInternalFields = (ticket: Record<string, unknown>) => {
  for (const field of REPORTER_FORBIDDEN_FIELDS) {
    expect(ticket, `field "${field}" leaked to reporter`).not.toHaveProperty(field);
  }
};

describe('Reporter-facing support ticket endpoints — internal field exposure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = reporterPrincipal as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/support/tickets/:ticketId', () => {
    it('does not return internal-only fields to the reporter', async () => {
      mockSupportTicketService.getTicketById.mockResolvedValue(buildFullTicket());

      const res = await request(buildApp()).get(`/api/v1/support/tickets/${ticketId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      assertNoInternalFields(res.body.data);
      // Sanity check that the legitimate fields still survive
      expect(res.body.data.ticketId).toBe(ticketId);
      expect(res.body.data.subject).toBe('Something is broken');
    });

    it('strips internal staff replies from the conversation thread', async () => {
      mockSupportTicketService.getTicketById.mockResolvedValue(buildFullTicket());

      const res = await request(buildApp()).get(`/api/v1/support/tickets/${ticketId}`);

      expect(res.status).toBe(200);
      const responses = res.body.data.Responses ?? res.body.data.responses ?? [];
      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(1);
      expect(responses[0].responseId).toBe('resp-1');
      expect(responses[0].isInternal).toBe(false);
    });

    it('returns 403 when the ticket does not belong to the authenticated user', async () => {
      mockSupportTicketService.getTicketById.mockResolvedValue(
        buildFullTicket({ userId: otherUserId })
      );

      const res = await request(buildApp()).get(`/api/v1/support/tickets/${ticketId}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/support/my-tickets', () => {
    it('does not return internal-only fields on any ticket in the list', async () => {
      mockSupportTicketService.getUserTickets.mockResolvedValue({
        tickets: [buildFullTicket(), buildFullTicket({ ticketId: 'other-ticket' })],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });

      const res = await request(buildApp()).get('/api/v1/support/my-tickets');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      for (const ticket of res.body.data as Record<string, unknown>[]) {
        assertNoInternalFields(ticket);
      }
    });
  });

  describe('POST /api/v1/support/tickets/:ticketId/reply', () => {
    it('strips internal-only fields from the ticket returned after a reply', async () => {
      mockSupportTicketService.getTicketById.mockResolvedValue(buildFullTicket());
      mockSupportTicketService.addResponse.mockResolvedValue(buildFullTicket());
      mockUser.findByPk.mockResolvedValue({
        userId: reporterUserId,
        firstName: 'R',
        lastName: 'Eporter',
      });

      const res = await request(buildApp())
        .post(`/api/v1/support/tickets/${ticketId}/reply`)
        .send({ content: 'Thanks for getting back to me.' });

      expect(res.status).toBe(200);
      assertNoInternalFields(res.body.data);
    });
  });

  describe('POST /api/v1/support/tickets', () => {
    it('strips internal-only fields from the newly created ticket payload', async () => {
      mockUser.findByPk.mockResolvedValue({
        userId: reporterUserId,
        firstName: 'R',
        lastName: 'Eporter',
        email: 'reporter@example.com',
      });
      mockSupportTicketService.createTicket.mockResolvedValue(buildFullTicket());

      const res = await request(buildApp()).post('/api/v1/support/tickets').send({
        subject: 'Hello',
        description: 'A long enough description goes here.',
        category: 'general_question',
      });

      expect(res.status).toBe(201);
      assertNoInternalFields(res.body.data);
    });
  });
});
