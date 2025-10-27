// Mock dependencies BEFORE imports
jest.mock('../../services/rescue.service');
jest.mock('../../services/email.service');
jest.mock('../../services/invitation.service');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { Response } from 'express';
import { RescueController } from '../../controllers/rescue.controller';
import { RescueService } from '../../services/rescue.service';
import EmailService from '../../services/email.service';
import { AuthenticatedRequest } from '../../types/auth';
import { logger } from '../../utils/logger';
import { UserType } from '../../models/User';

const MockedRescueService = RescueService as jest.Mocked<typeof RescueService>;
const MockedEmailService = EmailService as jest.Mocked<typeof EmailService>;

describe('RescueController - Email Functionality', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let controller: RescueController;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        userId: 'admin-123',
        email: 'admin@example.com',
        userType: UserType.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
      } as AuthenticatedRequest['user'],
      body: {},
      params: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    controller = new RescueController();
  });

  describe('sendEmail', () => {
    const mockRescue = {
      rescueId: 'rescue-123',
      name: 'Happy Paws Rescue',
      email: 'contact@happypaws.org',
      phone: '555-0123',
      address: '123 Pet Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'UK',
      status: 'verified',
    };

    it('should send email to rescue organization successfully', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        subject: 'Welcome to Adopt Don\'t Shop',
        body: 'Hello Happy Paws Rescue, welcome to our platform!',
        template: 'welcome',
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(mockRescue);
      MockedEmailService.sendEmail = jest.fn().mockResolvedValue('email-queue-123');

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(MockedRescueService.getRescueById).toHaveBeenCalledWith('rescue-123', false);
      expect(MockedEmailService.sendEmail).toHaveBeenCalledWith({
        toEmail: 'contact@happypaws.org',
        toName: 'Happy Paws Rescue',
        subject: 'Welcome to Adopt Don\'t Shop',
        htmlContent: 'Hello Happy Paws Rescue, welcome to our platform!',
        userId: 'admin-123',
        type: 'SYSTEM',
        priority: 'NORMAL',
        tags: ['rescue-email', 'rescue-123'],
        metadata: {
          rescueId: 'rescue-123',
          rescueName: 'Happy Paws Rescue',
          sentBy: 'admin-123',
          template: 'welcome',
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email sent successfully',
        data: {
          emailId: 'email-queue-123',
          recipientEmail: 'contact@happypaws.org',
        },
      });
    });

    it('should send email without template parameter', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        subject: 'Profile Update Reminder',
        body: 'Please update your rescue profile.',
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(mockRescue);
      MockedEmailService.sendEmail = jest.fn().mockResolvedValue('email-queue-456');

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(MockedEmailService.sendEmail).toHaveBeenCalledWith({
        toEmail: 'contact@happypaws.org',
        toName: 'Happy Paws Rescue',
        subject: 'Profile Update Reminder',
        htmlContent: 'Please update your rescue profile.',
        userId: 'admin-123',
        type: 'SYSTEM',
        priority: 'NORMAL',
        tags: ['rescue-email', 'rescue-123'],
        metadata: {
          rescueId: 'rescue-123',
          rescueName: 'Happy Paws Rescue',
          sentBy: 'admin-123',
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should replace template variables in email body', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        subject: 'Welcome to our platform',
        body: 'Hello {rescueName}, welcome to Adopt Don\'t Shop!',
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(mockRescue);
      MockedEmailService.sendEmail = jest.fn().mockResolvedValue('email-queue-789');

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(MockedEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlContent: 'Hello Happy Paws Rescue, welcome to Adopt Don\'t Shop!',
        })
      );
    });

    it('should handle rescue not found error', async () => {
      req.params = { rescueId: 'nonexistent-rescue' };
      req.body = {
        subject: 'Test',
        body: 'Test',
      };

      MockedRescueService.getRescueById = jest.fn().mockRejectedValue(new Error('Rescue not found'));

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rescue not found',
      });
    });

    it('should handle missing subject validation', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        body: 'Email body without subject',
      };

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subject and body are required',
      });
    });

    it('should handle missing body validation', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        subject: 'Email subject without body',
      };

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subject and body are required',
      });
    });

    it('should handle email service failure', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        subject: 'Test Email',
        body: 'Test Body',
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(mockRescue);
      MockedEmailService.sendEmail = jest.fn().mockRejectedValue(new Error('Email service unavailable'));

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to send email',
        error: 'Email service unavailable',
      });
    });

    it('should handle rescue with no email address', async () => {
      req.params = { rescueId: 'rescue-456' };
      req.body = {
        subject: 'Test Email',
        body: 'Test Body',
      };

      const rescueWithoutEmail = {
        ...mockRescue,
        email: '',
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(rescueWithoutEmail);

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rescue organization does not have an email address',
      });
    });

    it('should handle null email address', async () => {
      req.params = { rescueId: 'rescue-456' };
      req.body = {
        subject: 'Test Email',
        body: 'Test Body',
      };

      const rescueWithNullEmail = {
        ...mockRescue,
        email: null,
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(rescueWithNullEmail);

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rescue organization does not have an email address',
      });
    });

    it('should log email sending activity', async () => {
      req.params = { rescueId: 'rescue-123' };
      req.body = {
        subject: 'Welcome Email',
        body: 'Welcome to our platform!',
      };

      MockedRescueService.getRescueById = jest.fn().mockResolvedValue(mockRescue);
      MockedEmailService.sendEmail = jest.fn().mockResolvedValue('email-queue-999');

      await controller.sendEmail(req as AuthenticatedRequest, res as Response);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Email sent to rescue'),
        expect.objectContaining({
          rescueId: 'rescue-123',
          emailId: 'email-queue-999',
        })
      );
    });
  });
});
