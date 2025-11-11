import EmailQueue, { EmailStatus, EmailPriority, EmailType } from '../../models/EmailQueue';

describe('EmailQueue Model', () => {
  describe('Model Initialization and Structure', () => {
    describe('Default values', () => {
      it('should generate emailId automatically when not provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.emailId).toBeDefined();
        expect(email.emailId).toMatch(/^email_\d+_[a-z0-9]+$/);
      });

      it('should use provided emailId when given', () => {
        const customId = 'custom_email_123';
        const email = EmailQueue.build({
          emailId: customId,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.emailId).toBe(customId);
      });

      it('should set status to QUEUED by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.status).toBe(EmailStatus.QUEUED);
      });

      it('should set priority to NORMAL by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.priority).toBe(EmailPriority.NORMAL);
      });

      it('should set maxRetries to 3 by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.maxRetries).toBe(3);
      });

      it('should set currentRetries to 0 by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.currentRetries).toBe(0);
      });

      it('should initialize ccEmails as empty array by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.ccEmails).toEqual([]);
      });

      it('should initialize bccEmails as empty array by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.bccEmails).toEqual([]);
      });

      it('should initialize tags as empty array by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.tags).toEqual([]);
      });

      it('should initialize attachments as empty array by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.attachments).toEqual([]);
      });

      it('should initialize templateData as empty object by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.templateData).toEqual({});
      });

      it('should initialize metadata as empty object by default', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.metadata).toEqual({});
      });
    });

    describe('Required fields', () => {
      it('should allow creation with all required fields', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email).toBeDefined();
        expect(email.fromEmail).toBe('sender@example.com');
        expect(email.toEmail).toBe('recipient@example.com');
        expect(email.subject).toBe('Test Email');
        expect(email.htmlContent).toBe('<p>Test content</p>');
        expect(email.type).toBe(EmailType.TRANSACTIONAL);
      });

      it('should accept all email types', () => {
        Object.values(EmailType).forEach((type) => {
          const email = EmailQueue.build({
            fromEmail: 'sender@example.com',
            toEmail: 'recipient@example.com',
            subject: 'Test Email',
            htmlContent: '<p>Test content</p>',
            type,
          });

          expect(email.type).toBe(type);
        });
      });

      it('should accept all email priorities', () => {
        Object.values(EmailPriority).forEach((priority) => {
          const email = EmailQueue.build({
            fromEmail: 'sender@example.com',
            toEmail: 'recipient@example.com',
            subject: 'Test Email',
            htmlContent: '<p>Test content</p>',
            type: EmailType.TRANSACTIONAL,
            priority,
          });

          expect(email.priority).toBe(priority);
        });
      });

      it('should accept all email statuses', () => {
        Object.values(EmailStatus).forEach((status) => {
          const email = EmailQueue.build({
            fromEmail: 'sender@example.com',
            toEmail: 'recipient@example.com',
            subject: 'Test Email',
            htmlContent: '<p>Test content</p>',
            type: EmailType.TRANSACTIONAL,
            status,
          });

          expect(email.status).toBe(status);
        });
      });
    });

    describe('Optional fields', () => {
      it('should accept fromName when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          fromName: 'John Doe',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.fromName).toBe('John Doe');
      });

      it('should accept toName when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          toName: 'Jane Smith',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.toName).toBe('Jane Smith');
      });

      it('should accept replyToEmail when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          replyToEmail: 'reply@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.replyToEmail).toBe('reply@example.com');
      });

      it('should accept textContent when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          textContent: 'Test content',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.textContent).toBe('Test content');
      });

      it('should accept scheduledFor date when provided', () => {
        const scheduledDate = new Date('2025-12-31T12:00:00Z');
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          scheduledFor: scheduledDate,
        });

        expect(email.scheduledFor).toEqual(scheduledDate);
      });

      it('should accept templateId when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          templateId: 'template_123',
        });

        expect(email.templateId).toBe('template_123');
      });

      it('should accept templateData when provided', () => {
        const templateData = { username: 'johndoe', resetUrl: 'https://example.com/reset' };
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          templateData,
        });

        expect(email.templateData).toEqual(templateData);
      });

      it('should accept metadata when provided', () => {
        const metadata = { source: 'api', requestId: 'req_123' };
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          metadata,
        });

        expect(email.metadata).toEqual(metadata);
      });

      it('should accept campaignId when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.MARKETING,
          campaignId: 'campaign_123',
        });

        expect(email.campaignId).toBe('campaign_123');
      });

      it('should accept userId when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          userId: 'user_123',
        });

        expect(email.userId).toBe('user_123');
      });

      it('should accept createdBy when provided', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          createdBy: 'admin_123',
        });

        expect(email.createdBy).toBe('admin_123');
      });

      it('should accept attachments when provided', () => {
        const attachments = [
          {
            filename: 'document.pdf',
            content: 'base64content',
            contentType: 'application/pdf',
            size: 1024,
          },
        ];
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          attachments,
        });

        expect(email.attachments).toEqual(attachments);
      });

      it('should accept ccEmails array when provided', () => {
        const ccEmails = ['cc1@example.com', 'cc2@example.com'];
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          ccEmails,
        });

        expect(email.ccEmails).toEqual(ccEmails);
      });

      it('should accept bccEmails array when provided', () => {
        const bccEmails = ['bcc1@example.com', 'bcc2@example.com'];
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          bccEmails,
        });

        expect(email.bccEmails).toEqual(bccEmails);
      });

      it('should accept tags array when provided', () => {
        const tags = ['urgent', 'customer-support'];
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          tags,
        });

        expect(email.tags).toEqual(tags);
      });
    });
  });

  describe('Field Validations', () => {
    describe('Email format validation', () => {
      it('should accept valid fromEmail format', () => {
        const email = EmailQueue.build({
          fromEmail: 'valid.email@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.fromEmail).toBe('valid.email@example.com');
      });

      it('should accept valid toEmail format', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'valid.recipient+tag@example.co.uk',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.toEmail).toBe('valid.recipient+tag@example.co.uk');
      });

      it('should accept valid replyToEmail format', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          replyToEmail: 'reply.to@example.org',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.replyToEmail).toBe('reply.to@example.org');
      });
    });

    describe('Subject validation', () => {
      it('should accept subject with 1 character', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'A',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.subject).toBe('A');
      });

      it('should accept subject with 500 characters', () => {
        const subject = 'A'.repeat(500);
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject,
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.subject).toBe(subject);
        expect(email.subject.length).toBe(500);
      });

      it('should accept subject with special characters', () => {
        const subject = 'Test: Special $ubject! #123 @user - "quoted"';
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject,
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.subject).toBe(subject);
      });
    });

    describe('HTML content validation', () => {
      it('should accept valid HTML content', () => {
        const htmlContent = '<html><body><h1>Hello</h1><p>World</p></body></html>';
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent,
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.htmlContent).toBe(htmlContent);
      });

      it('should accept simple text in htmlContent', () => {
        const htmlContent = 'Simple text content';
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent,
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.htmlContent).toBe(htmlContent);
      });

      it('should accept HTML with inline styles', () => {
        const htmlContent = '<div style="color: red; font-size: 16px;">Styled content</div>';
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent,
          type: EmailType.TRANSACTIONAL,
        });

        expect(email.htmlContent).toBe(htmlContent);
      });
    });

    describe('Retry limits validation', () => {
      it('should accept maxRetries of 0', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 0,
        });

        expect(email.maxRetries).toBe(0);
      });

      it('should accept maxRetries of 10', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 10,
        });

        expect(email.maxRetries).toBe(10);
      });

      it('should accept maxRetries in valid range', () => {
        for (let i = 0; i <= 10; i++) {
          const email = EmailQueue.build({
            fromEmail: 'sender@example.com',
            toEmail: 'recipient@example.com',
            subject: 'Test',
            htmlContent: '<p>Test</p>',
            type: EmailType.TRANSACTIONAL,
            maxRetries: i,
          });

          expect(email.maxRetries).toBe(i);
        }
      });

      it('should accept currentRetries of 0', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          currentRetries: 0,
        });

        expect(email.currentRetries).toBe(0);
      });

      it('should accept positive currentRetries values', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          currentRetries: 5,
        });

        expect(email.currentRetries).toBe(5);
      });
    });
  });

  describe('isPending - Check if email is pending', () => {
    it('should return true when status is QUEUED', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isPending()).toBe(true);
    });

    it('should return false when status is not QUEUED', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isPending()).toBe(false);
    });
  });

  describe('isSent - Check if email was sent', () => {
    it('should return true for SENT status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isSent()).toBe(true);
    });

    it('should return true for DELIVERED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.DELIVERED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isSent()).toBe(true);
    });

    it('should return true for OPENED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.OPENED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isSent()).toBe(true);
    });

    it('should return true for CLICKED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.CLICKED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isSent()).toBe(true);
    });

    it('should return false for QUEUED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isSent()).toBe(false);
    });

    it('should return false for FAILED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.FAILED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isSent()).toBe(false);
    });
  });

  describe('isFailed - Check if email failed', () => {
    it('should return true for FAILED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.FAILED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isFailed()).toBe(true);
    });

    it('should return true for BOUNCED status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.BOUNCED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isFailed()).toBe(true);
    });

    it('should return false for SENT status', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isFailed()).toBe(false);
    });
  });

  describe('canRetry - Check if email can be retried', () => {
    it('should return true when failed and retries not exceeded', () => {
      const email = EmailQueue.build({
        status: EmailStatus.FAILED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 1,
      });

      expect(email.canRetry()).toBe(true);
    });

    it('should return false when retries exceeded', () => {
      const email = EmailQueue.build({
        status: EmailStatus.FAILED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 3,
      });

      expect(email.canRetry()).toBe(false);
    });

    it('should return false when not failed', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.canRetry()).toBe(false);
    });
  });

  describe('isScheduled - Check if email is scheduled for future', () => {
    it('should return true when scheduled for future', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        scheduledFor: futureDate,
      });

      expect(email.isScheduled()).toBe(true);
    });

    it('should return false when scheduled for past', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        scheduledFor: pastDate,
      });

      expect(email.isScheduled()).toBe(false);
    });

    it('should return false when not scheduled', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isScheduled()).toBe(false);
    });
  });

  describe('isReadyToSend - Check if email is ready to be sent', () => {
    it('should return true when pending and not scheduled', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isReadyToSend()).toBe(true);
    });

    it('should return true when pending and scheduled time has passed', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        scheduledFor: pastDate,
      });

      expect(email.isReadyToSend()).toBe(true);
    });

    it('should return false when scheduled for future', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        scheduledFor: futureDate,
      });

      expect(email.isReadyToSend()).toBe(false);
    });

    it('should return false when not pending', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.isReadyToSend()).toBe(false);
    });
  });

  describe('markAsSending - Update status to sending', () => {
    it('should set status to SENDING', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsSending();

      expect(email.status).toBe(EmailStatus.SENDING);
    });

    it('should set lastAttemptAt to current time', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      const beforeTime = Date.now();
      email.markAsSending();
      const afterTime = Date.now();

      expect(email.lastAttemptAt).toBeDefined();
      const attemptTime = email.lastAttemptAt!.getTime();
      expect(attemptTime).toBeGreaterThanOrEqual(beforeTime);
      expect(attemptTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('markAsSent - Update status to sent', () => {
    it('should set status to SENT', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsSent();

      expect(email.status).toBe(EmailStatus.SENT);
    });

    it('should set sentAt to current time', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      const beforeTime = Date.now();
      email.markAsSent();
      const afterTime = Date.now();

      expect(email.sentAt).toBeDefined();
      const sentTime = email.sentAt!.getTime();
      expect(sentTime).toBeGreaterThanOrEqual(beforeTime);
      expect(sentTime).toBeLessThanOrEqual(afterTime);
    });

    it('should set providerId when provided', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsSent('provider-123');

      expect(email.providerId).toBe('provider-123');
    });

    it('should set providerMessageId when provided', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsSent('provider-123', 'msg-456');

      expect(email.providerId).toBe('provider-123');
      expect(email.providerMessageId).toBe('msg-456');
    });
  });

  describe('markAsFailed - Update status to failed', () => {
    it('should set status to FAILED', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsFailed('Connection timeout');

      expect(email.status).toBe(EmailStatus.FAILED);
    });

    it('should set failureReason', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsFailed('Connection timeout');

      expect(email.failureReason).toBe('Connection timeout');
    });

    it('should increment currentRetries', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENDING,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 1,
      });

      email.markAsFailed('Connection timeout');

      expect(email.currentRetries).toBe(2);
    });
  });

  describe('markAsDelivered - Update status to delivered', () => {
    it('should set status to DELIVERED when email was sent', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsDelivered();

      expect(email.status).toBe(EmailStatus.DELIVERED);
    });

    it('should set deliveredAt in tracking when tracking exists', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        tracking: {
          trackingId: 'track-123',
          opens: [],
          clicks: [],
        },
      });

      email.markAsDelivered();

      expect(email.tracking?.deliveredAt).toBeDefined();
    });

    it('should not update status when email was not sent', () => {
      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsDelivered();

      expect(email.status).toBe(EmailStatus.QUEUED);
    });
  });

  describe('markAsBounced - Update status to bounced', () => {
    it('should set status to BOUNCED', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.markAsBounced();

      expect(email.status).toBe(EmailStatus.BOUNCED);
    });

    it('should set bouncedAt in tracking', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        tracking: {
          trackingId: 'track-123',
          opens: [],
          clicks: [],
        },
      });

      email.markAsBounced('Hard bounce');

      expect(email.tracking?.bouncedAt).toBeDefined();
      expect(email.tracking?.bounceReason).toBe('Hard bounce');
    });
  });

  describe('recordOpen - Track email open', () => {
    it('should create tracking if not exists', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordOpen('Mozilla/5.0', '192.168.1.1');

      expect(email.tracking).toBeDefined();
      expect(email.tracking?.opens).toHaveLength(1);
    });

    it('should add open event to tracking', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordOpen('Mozilla/5.0', '192.168.1.1');

      expect(email.tracking?.opens[0].userAgent).toBe('Mozilla/5.0');
      expect(email.tracking?.opens[0].ipAddress).toBe('192.168.1.1');
      expect(email.tracking?.opens[0].timestamp).toBeDefined();
    });

    it('should update status to OPENED when sent', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordOpen();

      expect(email.status).toBe(EmailStatus.OPENED);
    });

    it('should update status to OPENED when delivered', () => {
      const email = EmailQueue.build({
        status: EmailStatus.DELIVERED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordOpen();

      expect(email.status).toBe(EmailStatus.OPENED);
    });
  });

  describe('recordClick - Track email click', () => {
    it('should create tracking if not exists', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com', 'Mozilla/5.0', '192.168.1.1');

      expect(email.tracking).toBeDefined();
      expect(email.tracking?.clicks).toHaveLength(1);
    });

    it('should add click event to tracking', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com', 'Mozilla/5.0', '192.168.1.1');

      expect(email.tracking?.clicks[0].url).toBe('https://example.com');
      expect(email.tracking?.clicks[0].userAgent).toBe('Mozilla/5.0');
      expect(email.tracking?.clicks[0].ipAddress).toBe('192.168.1.1');
    });

    it('should update status to CLICKED when sent', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com');

      expect(email.status).toBe(EmailStatus.CLICKED);
    });

    it('should update status to CLICKED when opened', () => {
      const email = EmailQueue.build({
        status: EmailStatus.OPENED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com');

      expect(email.status).toBe(EmailStatus.CLICKED);
    });
  });

  describe('getOpenCount - Get number of opens', () => {
    it('should return 0 when no tracking', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.getOpenCount()).toBe(0);
    });

    it('should return correct count of opens', () => {
      const email = EmailQueue.build({
        status: EmailStatus.OPENED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordOpen();
      email.recordOpen();
      email.recordOpen();

      expect(email.getOpenCount()).toBe(3);
    });
  });

  describe('getClickCount - Get number of clicks', () => {
    it('should return 0 when no tracking', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.getClickCount()).toBe(0);
    });

    it('should return correct count of clicks', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com/page1');
      email.recordClick('https://example.com/page2');
      email.recordClick('https://example.com/page1'); // Duplicate URL

      expect(email.getClickCount()).toBe(3);
    });
  });

  describe('getUniqueClickCount - Get number of unique URLs clicked', () => {
    it('should return 0 when no tracking', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.getUniqueClickCount()).toBe(0);
    });

    it('should return count of unique URLs', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com/page1');
      email.recordClick('https://example.com/page2');
      email.recordClick('https://example.com/page1'); // Duplicate

      expect(email.getUniqueClickCount()).toBe(2);
    });
  });

  describe('hasBeenOpened - Check if email has been opened', () => {
    it('should return false when no opens', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.hasBeenOpened()).toBe(false);
    });

    it('should return true when email has been opened', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordOpen();

      expect(email.hasBeenOpened()).toBe(true);
    });
  });

  describe('hasBeenClicked - Check if email links have been clicked', () => {
    it('should return false when no clicks', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      expect(email.hasBeenClicked()).toBe(false);
    });

    it('should return true when email has been clicked', () => {
      const email = EmailQueue.build({
        status: EmailStatus.SENT,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
      });

      email.recordClick('https://example.com');

      expect(email.hasBeenClicked()).toBe(true);
    });
  });

  describe('getAge - Get email age in milliseconds', () => {
    it('should return age in milliseconds', () => {
      const createdDate = new Date(Date.now() - 5000); // 5 seconds ago

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        createdAt: createdDate,
      });

      const age = email.getAge();
      expect(age).toBeGreaterThanOrEqual(4900); // Allow for slight timing variance
      expect(age).toBeLessThan(6000);
    });
  });

  describe('getAgeInHours - Get email age in hours', () => {
    it('should return age in hours', () => {
      const createdDate = new Date(Date.now() - 7200000); // 2 hours ago

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        createdAt: createdDate,
      });

      expect(email.getAgeInHours()).toBe(2);
    });

    it('should round down partial hours', () => {
      const createdDate = new Date(Date.now() - 5400000); // 1.5 hours ago

      const email = EmailQueue.build({
        status: EmailStatus.QUEUED,
        fromEmail: 'test@example.com',
        toEmail: 'recipient@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        priority: EmailPriority.NORMAL,
        maxRetries: 3,
        currentRetries: 0,
        createdAt: createdDate,
      });

      expect(email.getAgeInHours()).toBe(1);
    });
  });

  describe('Edge Cases and Complex Behaviors', () => {
    describe('Tracking initialization edge cases', () => {
      it('should initialize tracking with unique trackingId on first open', () => {
        const email = EmailQueue.build({
          emailId: 'email_test_123',
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordOpen();

        expect(email.tracking?.trackingId).toMatch(/^track_email_test_123_\d+$/);
      });

      it('should initialize tracking with unique trackingId on first click', () => {
        const email = EmailQueue.build({
          emailId: 'email_test_456',
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordClick('https://example.com');

        expect(email.tracking?.trackingId).toMatch(/^track_email_test_456_\d+$/);
      });

      it('should not reinitialize tracking if already exists', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          tracking: {
            trackingId: 'existing_track_123',
            opens: [],
            clicks: [],
          },
        });

        email.recordOpen();

        expect(email.tracking?.trackingId).toBe('existing_track_123');
      });
    });

    describe('Multiple tracking events', () => {
      it('should track multiple opens with different metadata', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordOpen('Mozilla/5.0', '192.168.1.1');
        email.recordOpen('Chrome/91.0', '192.168.1.2');
        email.recordOpen('Safari/14.0', '192.168.1.3');

        expect(email.getOpenCount()).toBe(3);
        expect(email.tracking?.opens[0].userAgent).toBe('Mozilla/5.0');
        expect(email.tracking?.opens[1].userAgent).toBe('Chrome/91.0');
        expect(email.tracking?.opens[2].userAgent).toBe('Safari/14.0');
      });

      it('should track multiple clicks to different URLs', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordClick('https://example.com/page1');
        email.recordClick('https://example.com/page2');
        email.recordClick('https://example.com/page3');

        expect(email.getClickCount()).toBe(3);
        expect(email.getUniqueClickCount()).toBe(3);
      });

      it('should correctly count unique clicks with duplicate URLs', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordClick('https://example.com/page1');
        email.recordClick('https://example.com/page2');
        email.recordClick('https://example.com/page1'); // Duplicate
        email.recordClick('https://example.com/page3');
        email.recordClick('https://example.com/page2'); // Duplicate

        expect(email.getClickCount()).toBe(5);
        expect(email.getUniqueClickCount()).toBe(3);
      });
    });

    describe('Status transition behaviors', () => {
      it('should not update status to OPENED when email is in FAILED status', () => {
        const email = EmailQueue.build({
          status: EmailStatus.FAILED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordOpen();

        expect(email.status).toBe(EmailStatus.FAILED);
      });

      it('should not update status to CLICKED when email is in FAILED status', () => {
        const email = EmailQueue.build({
          status: EmailStatus.FAILED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordClick('https://example.com');

        expect(email.status).toBe(EmailStatus.FAILED);
      });

      it('should update status from DELIVERED to OPENED', () => {
        const email = EmailQueue.build({
          status: EmailStatus.DELIVERED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordOpen();

        expect(email.status).toBe(EmailStatus.OPENED);
      });

      it('should update status from DELIVERED to CLICKED', () => {
        const email = EmailQueue.build({
          status: EmailStatus.DELIVERED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.recordClick('https://example.com');

        expect(email.status).toBe(EmailStatus.CLICKED);
      });
    });

    describe('Retry behavior edge cases', () => {
      it('should allow retry when failed and currentRetries equals maxRetries - 1', () => {
        const email = EmailQueue.build({
          status: EmailStatus.FAILED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 3,
          currentRetries: 2,
        });

        expect(email.canRetry()).toBe(true);
      });

      it('should not allow retry when currentRetries equals maxRetries', () => {
        const email = EmailQueue.build({
          status: EmailStatus.FAILED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 3,
          currentRetries: 3,
        });

        expect(email.canRetry()).toBe(false);
      });

      it('should not allow retry when maxRetries is 0', () => {
        const email = EmailQueue.build({
          status: EmailStatus.FAILED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 0,
          currentRetries: 0,
        });

        expect(email.canRetry()).toBe(false);
      });

      it('should allow retry for BOUNCED status', () => {
        const email = EmailQueue.build({
          status: EmailStatus.BOUNCED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 3,
          currentRetries: 1,
        });

        expect(email.canRetry()).toBe(true);
      });

      it('should increment retries correctly when marking as failed multiple times', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENDING,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 5,
          currentRetries: 0,
        });

        email.markAsFailed('First failure');
        expect(email.currentRetries).toBe(1);

        email.markAsFailed('Second failure');
        expect(email.currentRetries).toBe(2);

        email.markAsFailed('Third failure');
        expect(email.currentRetries).toBe(3);
      });
    });

    describe('Schedule behavior edge cases', () => {
      it('should be ready to send when scheduled for exactly now', () => {
        const now = new Date();
        const email = EmailQueue.build({
          status: EmailStatus.QUEUED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          scheduledFor: now,
        });

        expect(email.isReadyToSend()).toBe(true);
      });

      it('should not be scheduled when scheduledFor is in the past', () => {
        const pastDate = new Date(Date.now() - 1000);
        const email = EmailQueue.build({
          status: EmailStatus.QUEUED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          scheduledFor: pastDate,
        });

        expect(email.isScheduled()).toBe(false);
        expect(email.isReadyToSend()).toBe(true);
      });
    });

    describe('Delivered status behavior', () => {
      it('should not update status when marking as delivered and email is QUEUED', () => {
        const email = EmailQueue.build({
          status: EmailStatus.QUEUED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.markAsDelivered();

        expect(email.status).toBe(EmailStatus.QUEUED);
      });

      it('should update status when marking as delivered and email is CLICKED', () => {
        const email = EmailQueue.build({
          status: EmailStatus.CLICKED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.markAsDelivered();

        expect(email.status).toBe(EmailStatus.DELIVERED);
      });

      it('should update status when marking as delivered and email is OPENED', () => {
        const email = EmailQueue.build({
          status: EmailStatus.OPENED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.markAsDelivered();

        expect(email.status).toBe(EmailStatus.DELIVERED);
      });
    });

    describe('Bounced status behavior', () => {
      it('should set bounce information when marking as bounced without existing tracking', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.markAsBounced('Mailbox full');

        expect(email.status).toBe(EmailStatus.BOUNCED);
        expect(email.tracking?.bouncedAt).toBeDefined();
        expect(email.tracking?.bounceReason).toBe('Mailbox full');
      });

      it('should mark as bounced without reason', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          tracking: {
            trackingId: 'track_123',
            opens: [],
            clicks: [],
          },
        });

        email.markAsBounced();

        expect(email.status).toBe(EmailStatus.BOUNCED);
        expect(email.tracking?.bouncedAt).toBeDefined();
        expect(email.tracking?.bounceReason).toBeUndefined();
      });
    });

    describe('Provider information behavior', () => {
      it('should set only providerId when providerMessageId is not provided', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENDING,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.markAsSent('sendgrid-123');

        expect(email.providerId).toBe('sendgrid-123');
        expect(email.providerMessageId).toBeUndefined();
      });

      it('should not set provider info when not provided', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENDING,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
        });

        email.markAsSent();

        expect(email.providerId).toBeUndefined();
        expect(email.providerMessageId).toBeUndefined();
      });
    });

    describe('Age calculations with edge cases', () => {
      it('should return 0 age for just created email', () => {
        const email = EmailQueue.build({
          status: EmailStatus.QUEUED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          createdAt: new Date(),
        });

        const age = email.getAge();
        expect(age).toBeLessThan(1000); // Less than 1 second
      });

      it('should return 0 hours for email less than 1 hour old', () => {
        const createdDate = new Date(Date.now() - 3000000); // 50 minutes ago
        const email = EmailQueue.build({
          status: EmailStatus.QUEUED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          createdAt: createdDate,
        });

        expect(email.getAgeInHours()).toBe(0);
      });

      it('should handle very old emails correctly', () => {
        const createdDate = new Date(Date.now() - 86400000 * 30); // 30 days ago
        const email = EmailQueue.build({
          status: EmailStatus.QUEUED,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          createdAt: createdDate,
        });

        expect(email.getAgeInHours()).toBeGreaterThan(700); // More than 700 hours
      });
    });

    describe('Complex workflow scenarios', () => {
      it('should handle complete email lifecycle from queued to clicked', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
        });

        // Initial state
        expect(email.status).toBe(EmailStatus.QUEUED);
        expect(email.isPending()).toBe(true);
        expect(email.isReadyToSend()).toBe(true);

        // Mark as sending
        email.markAsSending();
        expect(email.status).toBe(EmailStatus.SENDING);
        expect(email.lastAttemptAt).toBeDefined();

        // Mark as sent
        email.markAsSent('provider-123', 'msg-456');
        expect(email.status).toBe(EmailStatus.SENT);
        expect(email.sentAt).toBeDefined();
        expect(email.isSent()).toBe(true);

        // Mark as delivered
        email.markAsDelivered();
        expect(email.status).toBe(EmailStatus.DELIVERED);

        // Record open
        email.recordOpen('Mozilla/5.0', '192.168.1.1');
        expect(email.status).toBe(EmailStatus.OPENED);
        expect(email.hasBeenOpened()).toBe(true);

        // Record click
        email.recordClick('https://example.com', 'Mozilla/5.0', '192.168.1.1');
        expect(email.status).toBe(EmailStatus.CLICKED);
        expect(email.hasBeenClicked()).toBe(true);
      });

      it('should handle failed email with retries', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          type: EmailType.TRANSACTIONAL,
          maxRetries: 3,
        });

        // First attempt
        email.markAsSending();
        email.markAsFailed('Connection timeout');
        expect(email.status).toBe(EmailStatus.FAILED);
        expect(email.currentRetries).toBe(1);
        expect(email.canRetry()).toBe(true);

        // Second attempt
        email.markAsSending();
        email.markAsFailed('Server error');
        expect(email.currentRetries).toBe(2);
        expect(email.canRetry()).toBe(true);

        // Third attempt
        email.markAsSending();
        email.markAsFailed('Network error');
        expect(email.currentRetries).toBe(3);
        expect(email.canRetry()).toBe(false);
      });

      it('should handle scheduled email workflow', () => {
        const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Scheduled Email',
          htmlContent: '<p>Scheduled content</p>',
          type: EmailType.MARKETING,
          scheduledFor: futureDate,
        });

        expect(email.isPending()).toBe(true);
        expect(email.isScheduled()).toBe(true);
        expect(email.isReadyToSend()).toBe(false);
      });

      it('should track comprehensive email engagement', () => {
        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Engagement Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.MARKETING,
          status: EmailStatus.SENT,
        });

        // User opens email multiple times
        email.recordOpen('Mozilla/5.0', '192.168.1.1');
        email.recordOpen('Chrome/91.0', '192.168.1.1');

        // User clicks multiple links
        email.recordClick('https://example.com/cta1', 'Mozilla/5.0', '192.168.1.1');
        email.recordClick('https://example.com/cta2', 'Mozilla/5.0', '192.168.1.1');
        email.recordClick('https://example.com/cta1', 'Mozilla/5.0', '192.168.1.1'); // Duplicate

        expect(email.status).toBe(EmailStatus.CLICKED);
        expect(email.getOpenCount()).toBe(2);
        expect(email.getClickCount()).toBe(3);
        expect(email.getUniqueClickCount()).toBe(2);
        expect(email.hasBeenOpened()).toBe(true);
        expect(email.hasBeenClicked()).toBe(true);
      });
    });

    describe('Attachment handling', () => {
      it('should handle multiple attachments', () => {
        const attachments = [
          {
            filename: 'document1.pdf',
            content: 'base64content1',
            contentType: 'application/pdf',
            size: 1024,
          },
          {
            filename: 'image.jpg',
            content: 'base64content2',
            contentType: 'image/jpeg',
            size: 2048,
            inline: true,
            cid: 'image001',
          },
        ];

        const email = EmailQueue.build({
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Email with Attachments',
          htmlContent: '<p>See attachments</p>',
          type: EmailType.TRANSACTIONAL,
          attachments,
        });

        expect(email.attachments).toHaveLength(2);
        expect(email.attachments?.[0].filename).toBe('document1.pdf');
        expect(email.attachments?.[1].inline).toBe(true);
        expect(email.attachments?.[1].cid).toBe('image001');
      });
    });

    describe('Empty tracking data edge cases', () => {
      it('should return 0 for open count when tracking exists but opens array is empty', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          tracking: {
            trackingId: 'track_123',
            opens: [],
            clicks: [],
          },
        });

        expect(email.getOpenCount()).toBe(0);
        expect(email.hasBeenOpened()).toBe(false);
      });

      it('should return 0 for click count when tracking exists but clicks array is empty', () => {
        const email = EmailQueue.build({
          status: EmailStatus.SENT,
          fromEmail: 'sender@example.com',
          toEmail: 'recipient@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          tracking: {
            trackingId: 'track_123',
            opens: [],
            clicks: [],
          },
        });

        expect(email.getClickCount()).toBe(0);
        expect(email.getUniqueClickCount()).toBe(0);
        expect(email.hasBeenClicked()).toBe(false);
      });
    });
  });
});
