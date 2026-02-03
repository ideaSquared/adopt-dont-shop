import { describe, it, expect } from 'vitest';
import { Request } from 'express';
import { validationResult } from 'express-validator';
import { emailValidation } from '../../validation/email.validation';

const runValidation = async (
  validators: ReturnType<typeof emailValidation.getTemplates>,
  req: Partial<Request>
) => {
  const mockReq = {
    body: {},
    params: {},
    query: {},
    ...req,
  } as Request;

  for (const validator of validators) {
    await (validator as { run: (req: Request) => Promise<void> }).run(mockReq);
  }

  return validationResult(mockReq);
};

describe('Email Validation', () => {
  describe('getTemplateById', () => {
    it('should pass with valid UUID', async () => {
      const result = await runValidation(emailValidation.getTemplateById, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject non-UUID templateId', async () => {
      const result = await runValidation(emailValidation.getTemplateById, {
        params: { templateId: 'not-a-uuid' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('createTemplate', () => {
    const validTemplate = {
      name: 'Welcome Template',
      type: 'WELCOME',
      subject: 'Welcome to our platform',
      htmlContent: '<h1>Welcome!</h1>',
    };

    it('should pass with valid template data', async () => {
      const result = await runValidation(emailValidation.createTemplate, {
        body: validTemplate,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid template type', async () => {
      const result = await runValidation(emailValidation.createTemplate, {
        body: { ...validTemplate, type: 'INVALID_TYPE' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject empty name', async () => {
      const result = await runValidation(emailValidation.createTemplate, {
        body: { ...validTemplate, name: '' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject name exceeding max length', async () => {
      const result = await runValidation(emailValidation.createTemplate, {
        body: { ...validTemplate, name: 'a'.repeat(101) },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject empty subject', async () => {
      const result = await runValidation(emailValidation.createTemplate, {
        body: { ...validTemplate, subject: '' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updateTemplate', () => {
    it('should pass with valid UUID and optional fields', async () => {
      const result = await runValidation(emailValidation.updateTemplate, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Updated Name' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid templateId', async () => {
      const result = await runValidation(emailValidation.updateTemplate, {
        params: { templateId: 'bad-id' },
        body: { name: 'Updated Name' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with no body fields (all optional)', async () => {
      const result = await runValidation(emailValidation.updateTemplate, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {},
      });

      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('deleteTemplate', () => {
    it('should pass with valid UUID', async () => {
      const result = await runValidation(emailValidation.deleteTemplate, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid UUID', async () => {
      const result = await runValidation(emailValidation.deleteTemplate, {
        params: { templateId: '123' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('sendTestEmail', () => {
    it('should pass with valid email and templateId', async () => {
      const result = await runValidation(emailValidation.sendTestEmail, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { testEmail: 'test@example.com' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid email address', async () => {
      const result = await runValidation(emailValidation.sendTestEmail, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { testEmail: 'not-an-email' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should pass with valid send data', async () => {
      const result = await runValidation(emailValidation.sendEmail, {
        body: {
          to: 'user@example.com',
          subject: 'Test Subject',
          htmlContent: '<p>Hello</p>',
        },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid recipient email', async () => {
      const result = await runValidation(emailValidation.sendEmail, {
        body: {
          to: 'invalid',
          subject: 'Test',
          htmlContent: '<p>Hello</p>',
        },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid priority', async () => {
      const result = await runValidation(emailValidation.sendEmail, {
        body: {
          to: 'user@example.com',
          subject: 'Test',
          priority: 'URGENT',
        },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('sendBulkEmail', () => {
    it('should pass with valid bulk email data', async () => {
      const result = await runValidation(emailValidation.sendBulkEmail, {
        body: {
          templateId: '550e8400-e29b-41d4-a716-446655440000',
          recipients: [{ email: 'user@example.com' }],
        },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject empty recipients array', async () => {
      const result = await runValidation(emailValidation.sendBulkEmail, {
        body: {
          templateId: '550e8400-e29b-41d4-a716-446655440000',
          recipients: [],
        },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject recipients exceeding 1000', async () => {
      const recipients = Array.from({ length: 1001 }, (_, i) => ({
        email: `user${i}@example.com`,
      }));
      const result = await runValidation(emailValidation.sendBulkEmail, {
        body: {
          templateId: '550e8400-e29b-41d4-a716-446655440000',
          recipients,
        },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should pass with valid queue status filter', async () => {
      const result = await runValidation(emailValidation.getQueueStatus, {
        query: { status: 'PENDING', limit: '50', offset: '0' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid queue status', async () => {
      const result = await runValidation(emailValidation.getQueueStatus, {
        query: { status: 'INVALID' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject limit exceeding 100', async () => {
      const result = await runValidation(emailValidation.getQueueStatus, {
        query: { limit: '101' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getEmailAnalytics', () => {
    it('should pass with valid analytics query', async () => {
      const result = await runValidation(emailValidation.getEmailAnalytics, {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'month',
        } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid groupBy value', async () => {
      const result = await runValidation(emailValidation.getEmailAnalytics, {
        query: { groupBy: 'invalid' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid date format', async () => {
      const result = await runValidation(emailValidation.getEmailAnalytics, {
        query: { startDate: 'not-a-date' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getTemplateAnalytics', () => {
    it('should pass with valid templateId', async () => {
      const result = await runValidation(emailValidation.getTemplateAnalytics, {
        params: { templateId: '550e8400-e29b-41d4-a716-446655440000' },
        query: {} as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid templateId', async () => {
      const result = await runValidation(emailValidation.getTemplateAnalytics, {
        params: { templateId: 'bad-id' },
        query: {} as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getUserPreferences', () => {
    it('should pass with valid userId', async () => {
      const result = await runValidation(emailValidation.getUserPreferences, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid userId', async () => {
      const result = await runValidation(emailValidation.getUserPreferences, {
        params: { userId: 'not-uuid' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updateUserPreferences', () => {
    it('should pass with valid preferences', async () => {
      const result = await runValidation(emailValidation.updateUserPreferences, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          emailNotifications: true,
          frequency: 'DAILY',
        },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid frequency', async () => {
      const result = await runValidation(emailValidation.updateUserPreferences, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { frequency: 'HOURLY' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });
});
