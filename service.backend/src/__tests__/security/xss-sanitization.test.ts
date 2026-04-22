import { vi } from 'vitest';
import { Response } from 'express';

// Mocks must be hoisted before imports
vi.mock('../../services/application.service');
vi.mock('../../services/rescue.service');
vi.mock('../../services/invitation.service');
vi.mock('../../services/supportTicket.service', () => ({
  default: {
    createTicket: vi.fn(),
    updateTicket: vi.fn(),
    addResponse: vi.fn(),
    getTicketById: vi.fn(),
    getAgentTickets: vi.fn(),
    getTickets: vi.fn(),
    getTicketStats: vi.fn(),
    assignTicket: vi.fn(),
    escalateTicket: vi.fn(),
  },
}));
vi.mock('../../services/notification.service');
vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn(),
    queueEmail: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    getTemplates: vi.fn(),
    getTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    retryFailedEmails: vi.fn(),
    getEmailAnalytics: vi.fn(),
    getQueueStatus: vi.fn(),
    sendBulkEmail: vi.fn(),
    unsubscribeUser: vi.fn(),
    handleDeliveryWebhook: vi.fn(),
  },
}));
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ApplicationController } from '../../controllers/application.controller';
import { ApplicationService } from '../../services/application.service';
import { RescueController } from '../../controllers/rescue.controller';
import { RescueService } from '../../services/rescue.service';
import { SupportTicketController } from '../../controllers/supportTicket.controller';
import SupportTicketService from '../../services/supportTicket.service';
import { NotificationController } from '../../controllers/notification.controller';
import { NotificationService } from '../../services/notification.service';
import { createTemplate, updateTemplate } from '../../controllers/email.controller';
import emailService from '../../services/email.service';
import { AuthenticatedRequest } from '../../types';
import { UserType } from '../../models/User';

const XSS_PAYLOAD = '<script>alert("xss")</script>';
const XSS_WITH_TEXT = `${XSS_PAYLOAD}Important content`;
const XSS_EVENT_HANDLER = '<p onclick="alert(1)">text</p>';

const mockUser = {
  userId: 'user-123',
  email: 'test@example.com',
  userType: UserType.ADOPTER,
  firstName: 'Test',
  lastName: 'User',
} as AuthenticatedRequest['user'];

const mockRes = (): Partial<Response> => ({
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

// ============================================================
// ApplicationController
// ============================================================

describe('ApplicationController - XSS sanitization', () => {
  let controller: ApplicationController;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ApplicationController();
    res = mockRes();
    vi.mocked(ApplicationService.createApplication).mockResolvedValue({
      applicationId: 'app-123',
    } as unknown as ReturnType<typeof ApplicationService.createApplication> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(ApplicationService.updateApplication).mockResolvedValue({
      applicationId: 'app-123',
    } as unknown as ReturnType<typeof ApplicationService.updateApplication> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(ApplicationService.updateApplicationStatus).mockResolvedValue({
      applicationId: 'app-123',
    } as unknown as ReturnType<typeof ApplicationService.updateApplicationStatus> extends Promise<
      infer T
    >
      ? T
      : never);
  });

  describe('createApplication', () => {
    it('sanitizes XSS from notes before calling service', async () => {
      const req = {
        user: mockUser,
        body: {
          petId: '00000000-0000-0000-0000-000000000001',
          answers: {},
          references: [{ name: 'Jane', relationship: 'friend', phone: '+15551234567' }],
          notes: XSS_WITH_TEXT,
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await controller.createApplication(req, res as Response);

      const [applicationData] = vi.mocked(ApplicationService.createApplication).mock.calls[0];
      expect(applicationData.notes).not.toContain('<script>');
      expect(applicationData.notes).toContain('Important content');
    });

    it('passes plain text notes through unchanged', async () => {
      const plainNotes = 'No HTML here, just text';
      const req = {
        user: mockUser,
        body: {
          petId: '00000000-0000-0000-0000-000000000001',
          answers: {},
          references: [{ name: 'Jane', relationship: 'friend', phone: '+15551234567' }],
          notes: plainNotes,
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await controller.createApplication(req, res as Response);

      const [applicationData] = vi.mocked(ApplicationService.createApplication).mock.calls[0];
      expect(applicationData.notes).toBe(plainNotes);
    });
  });

  describe('updateApplication', () => {
    it('sanitizes XSS from notes, interviewNotes, and homeVisitNotes', async () => {
      const req = {
        user: mockUser,
        body: {
          notes: XSS_WITH_TEXT,
          interviewNotes: `${XSS_PAYLOAD}Interview content`,
          homeVisitNotes: `${XSS_PAYLOAD}Home visit content`,
        },
        params: { applicationId: 'app-123' },
      } as unknown as AuthenticatedRequest;

      await controller.updateApplication(req, res as Response);

      const [, body] = vi.mocked(ApplicationService.updateApplication).mock.calls[0];
      const sanitizedBody = body as Record<string, string>;
      expect(sanitizedBody.notes).not.toContain('<script>');
      expect(sanitizedBody.interviewNotes).not.toContain('<script>');
      expect(sanitizedBody.homeVisitNotes).not.toContain('<script>');
      expect(sanitizedBody.notes).toContain('Important content');
      expect(sanitizedBody.interviewNotes).toContain('Interview content');
      expect(sanitizedBody.homeVisitNotes).toContain('Home visit content');
    });
  });

  describe('updateApplicationStatus', () => {
    it('sanitizes XSS from notes and rejectionReason', async () => {
      const req = {
        user: mockUser,
        body: {
          status: 'rejected',
          notes: XSS_WITH_TEXT,
          rejectionReason: `${XSS_PAYLOAD}Rejection reason`,
        },
        params: { applicationId: 'app-123' },
      } as unknown as AuthenticatedRequest;

      await controller.updateApplicationStatus(req, res as Response);

      const [, statusUpdate] = vi.mocked(ApplicationService.updateApplicationStatus).mock.calls[0];
      expect(statusUpdate.notes).not.toContain('<script>');
      expect(statusUpdate.rejectionReason).not.toContain('<script>');
      expect(statusUpdate.notes).toContain('Important content');
      expect(statusUpdate.rejectionReason).toContain('Rejection reason');
    });
  });
});

// ============================================================
// RescueController
// ============================================================

describe('RescueController - XSS sanitization', () => {
  let controller: RescueController;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new RescueController();
    res = mockRes();
    vi.mocked(RescueService.createRescue).mockResolvedValue({
      rescueId: 'rescue-123',
    } as unknown as ReturnType<typeof RescueService.createRescue> extends Promise<infer T>
      ? T
      : never);
    vi.mocked(RescueService.updateRescue).mockResolvedValue({
      rescueId: 'rescue-123',
    } as unknown as ReturnType<typeof RescueService.updateRescue> extends Promise<infer T>
      ? T
      : never);
  });

  describe('createRescue', () => {
    it('sanitizes XSS from description before calling service', async () => {
      const req = {
        user: mockUser,
        body: {
          name: 'Happy Paws',
          email: 'rescue@example.com',
          description: XSS_WITH_TEXT,
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await controller.createRescue(req, res as Response);

      const [rescueData] = vi.mocked(RescueService.createRescue).mock.calls[0];
      expect(rescueData.description).not.toContain('<script>');
      expect(rescueData.description).toContain('Important content');
    });

    it('passes plain text description through unchanged', async () => {
      const plainDesc = 'We help animals find homes';
      const req = {
        user: mockUser,
        body: { name: 'Happy Paws', email: 'rescue@example.com', description: plainDesc },
        params: {},
      } as unknown as AuthenticatedRequest;

      await controller.createRescue(req, res as Response);

      const [rescueData] = vi.mocked(RescueService.createRescue).mock.calls[0];
      expect(rescueData.description).toBe(plainDesc);
    });
  });

  describe('updateRescue', () => {
    it('sanitizes XSS from description before calling service', async () => {
      const req = {
        user: mockUser,
        body: { description: XSS_WITH_TEXT },
        params: { rescueId: 'rescue-123' },
      } as unknown as AuthenticatedRequest;

      await controller.updateRescue(req, res as Response);

      const [, updateData] = vi.mocked(RescueService.updateRescue).mock.calls[0];
      expect((updateData as Record<string, string>).description).not.toContain('<script>');
      expect((updateData as Record<string, string>).description).toContain('Important content');
    });
  });
});

// ============================================================
// SupportTicketController
// ============================================================

describe('SupportTicketController - XSS sanitization', () => {
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = mockRes();
    vi.mocked(SupportTicketService.createTicket).mockResolvedValue({
      ticketId: 'ticket-123',
      toJSON: vi
        .fn()
        .mockReturnValue({ ticketId: 'ticket-123', createdAt: new Date(), updatedAt: new Date() }),
    } as unknown as Awaited<ReturnType<typeof SupportTicketService.createTicket>>);
    vi.mocked(SupportTicketService.updateTicket).mockResolvedValue({
      ticketId: 'ticket-123',
      toJSON: vi
        .fn()
        .mockReturnValue({ ticketId: 'ticket-123', createdAt: new Date(), updatedAt: new Date() }),
    } as unknown as Awaited<ReturnType<typeof SupportTicketService.updateTicket>>);
    vi.mocked(SupportTicketService.addResponse).mockResolvedValue({
      ticketId: 'ticket-123',
      toJSON: vi
        .fn()
        .mockReturnValue({ ticketId: 'ticket-123', createdAt: new Date(), updatedAt: new Date() }),
    } as unknown as Awaited<ReturnType<typeof SupportTicketService.addResponse>>);
  });

  describe('createTicket', () => {
    it('sanitizes XSS from description before calling service', async () => {
      const req = {
        body: {
          userEmail: 'user@example.com',
          subject: 'Help needed',
          description: XSS_WITH_TEXT,
          category: 'technical',
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await SupportTicketController.createTicket(req, res as Response);

      const [ticketData] = vi.mocked(SupportTicketService.createTicket).mock.calls[0];
      expect(ticketData.description).not.toContain('<script>');
      expect(ticketData.description).toContain('Important content');
    });
  });

  describe('addResponse', () => {
    it('sanitizes XSS from response content before calling service', async () => {
      const req = {
        user: mockUser,
        body: { content: XSS_WITH_TEXT },
        params: { ticketId: 'ticket-123' },
      } as unknown as AuthenticatedRequest;

      await SupportTicketController.addResponse(req, res as Response);

      const [, responseData] = vi.mocked(SupportTicketService.addResponse).mock.calls[0];
      expect(responseData.content).not.toContain('<script>');
      expect(responseData.content).toContain('Important content');
    });
  });
});

// ============================================================
// NotificationController
// ============================================================

describe('NotificationController - XSS sanitization', () => {
  let controller: NotificationController;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new NotificationController();
    res = mockRes();
    vi.mocked(NotificationService.createNotification).mockResolvedValue({
      notificationId: 'notif-123',
    } as unknown as Awaited<ReturnType<typeof NotificationService.createNotification>>);
    vi.mocked(NotificationService.createBulkNotifications).mockResolvedValue({
      count: 1,
      notifications: [],
    } as unknown as Awaited<ReturnType<typeof NotificationService.createBulkNotifications>>);
  });

  describe('createNotification', () => {
    it('sanitizes XSS from message before calling service', async () => {
      const req = {
        user: mockUser,
        body: {
          userId: 'target-user-123',
          type: 'info',
          title: 'Test notification',
          message: XSS_WITH_TEXT,
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await controller.createNotification(req, res as Response);

      const [notifData] = vi.mocked(NotificationService.createNotification).mock.calls[0];
      expect(notifData.message).not.toContain('<script>');
      expect(notifData.message).toContain('Important content');
    });
  });

  describe('createBulkNotifications', () => {
    it('sanitizes XSS from message in bulk notification data before calling service', async () => {
      const req = {
        user: mockUser,
        body: {
          userIds: ['user-1', 'user-2'],
          type: 'info',
          title: 'Bulk notification',
          message: XSS_WITH_TEXT,
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await controller.createBulkNotifications(req, res as Response);

      const [, notifData] = vi.mocked(NotificationService.createBulkNotifications).mock.calls[0];
      expect((notifData as Record<string, string>).message).not.toContain('<script>');
      expect((notifData as Record<string, string>).message).toContain('Important content');
    });
  });
});

// ============================================================
// EmailController (createTemplate / updateTemplate)
// ============================================================

describe('EmailController - XSS sanitization', () => {
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = mockRes();
    vi.mocked(emailService.createTemplate).mockResolvedValue({
      templateId: 'tmpl-123',
    } as unknown as Awaited<ReturnType<typeof emailService.createTemplate>>);
    vi.mocked(emailService.updateTemplate).mockResolvedValue({
      templateId: 'tmpl-123',
    } as unknown as Awaited<ReturnType<typeof emailService.updateTemplate>>);
  });

  describe('createTemplate', () => {
    it('sanitizes XSS from htmlContent before calling service', async () => {
      const req = {
        user: mockUser,
        body: {
          name: 'Welcome email',
          htmlContent: XSS_WITH_TEXT,
          subject: 'Welcome!',
        },
        params: {},
      } as unknown as AuthenticatedRequest;

      await createTemplate(req, res as Response);

      const [templateData] = vi.mocked(emailService.createTemplate).mock.calls[0];
      expect((templateData as Record<string, string>).htmlContent).not.toContain('<script>');
      expect((templateData as Record<string, string>).htmlContent).toContain('Important content');
    });

    it('preserves event handler-free HTML in htmlContent', async () => {
      const safeHtml = '<p>Welcome <strong>there</strong>!</p>';
      const req = {
        user: mockUser,
        body: { name: 'Welcome email', htmlContent: safeHtml, subject: 'Welcome!' },
        params: {},
      } as unknown as AuthenticatedRequest;

      await createTemplate(req, res as Response);

      const [templateData] = vi.mocked(emailService.createTemplate).mock.calls[0];
      expect((templateData as Record<string, string>).htmlContent).toContain('<p>');
      expect((templateData as Record<string, string>).htmlContent).toContain('<strong>');
    });
  });

  describe('updateTemplate', () => {
    it('sanitizes XSS from htmlContent before calling service', async () => {
      const req = {
        user: mockUser,
        body: { htmlContent: `${XSS_PAYLOAD}Updated content` },
        params: { templateId: 'tmpl-123' },
      } as unknown as AuthenticatedRequest;

      await updateTemplate(req, res as Response);

      const [, updates] = vi.mocked(emailService.updateTemplate).mock.calls[0];
      expect((updates as Record<string, string>).htmlContent).not.toContain('<script>');
      expect((updates as Record<string, string>).htmlContent).toContain('Updated content');
    });

    it('sanitizes event handler attributes from htmlContent', async () => {
      const req = {
        user: mockUser,
        body: { htmlContent: XSS_EVENT_HANDLER },
        params: { templateId: 'tmpl-123' },
      } as unknown as AuthenticatedRequest;

      await updateTemplate(req, res as Response);

      const [, updates] = vi.mocked(emailService.updateTemplate).mock.calls[0];
      expect((updates as Record<string, string>).htmlContent).not.toContain('onclick');
    });
  });
});
