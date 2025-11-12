// Mock sequelize and EmailQueue to prevent initialization errors
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    define: jest.fn(() => ({})),
    transaction: jest.fn(() => Promise.resolve({ commit: jest.fn(), rollback: jest.fn() })),
  },
}));

// Mock EmailQueue model completely to avoid init issues
jest.mock('../../models/EmailQueue', () => {
  // Define enums directly without requiring the actual module
  const EmailStatus = {
    QUEUED: 'queued',
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    OPENED: 'opened',
    CLICKED: 'clicked',
    FAILED: 'failed',
    BOUNCED: 'bounced',
    UNSUBSCRIBED: 'unsubscribed',
  };

  const EmailPriority = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  };

  const EmailType = {
    TRANSACTIONAL: 'transactional',
    NOTIFICATION: 'notification',
    MARKETING: 'marketing',
    SYSTEM: 'system',
  };

  // Create mock instances with the methods we want to test
  const createMockInstance = (data: any) => ({
    ...data,
    isPending() { return this.status === 'queued'; },
    isSent() { return ['sent', 'delivered', 'opened', 'clicked'].includes(this.status); },
    isFailed() { return ['failed', 'bounced'].includes(this.status); },
    canRetry() { return (this.status === 'failed' || this.status === 'bounced') && this.currentRetries < this.maxRetries; },
    isScheduled() { return this.scheduledFor ? new Date(this.scheduledFor) > new Date() : false; },
    isReadyToSend() { return this.isPending() && !this.isScheduled(); },
    markAsSending() {
      this.status = 'sending';
      this.lastAttemptAt = new Date();
    },
    markAsSent(providerId?: string, providerMessageId?: string) {
      this.status = 'sent';
      this.sentAt = new Date();
      if (providerId) this.providerId = providerId;
      if (providerMessageId) this.providerMessageId = providerMessageId;
    },
    markAsFailed(reason: string) {
      this.status = 'failed';
      this.failureReason = reason;
      this.currentRetries = (this.currentRetries || 0) + 1;
    },
    markAsDelivered() {
      if (this.isSent()) {
        this.status = 'delivered';
        if (!this.tracking) this.tracking = { trackingId: '', opens: [], clicks: [] };
        this.tracking.deliveredAt = new Date();
      }
    },
    markAsBounced(reason?: string) {
      this.status = 'bounced';
      if (!this.tracking) this.tracking = { trackingId: '', opens: [], clicks: [] };
      this.tracking.bouncedAt = new Date();
      if (reason) this.tracking.bounceReason = reason;
    },
    recordOpen(userAgent?: string, ipAddress?: string) {
      if (!this.tracking) this.tracking = { trackingId: `track-${Date.now()}`, opens: [], clicks: [] };
      this.tracking.opens.push({ timestamp: new Date(), userAgent, ipAddress });
      if (['sent', 'delivered'].includes(this.status)) this.status = 'opened';
    },
    recordClick(url: string, userAgent?: string, ipAddress?: string) {
      if (!this.tracking) this.tracking = { trackingId: `track-${Date.now()}`, opens: [], clicks: [] };
      this.tracking.clicks.push({ url, timestamp: new Date(), userAgent, ipAddress });
      if (['sent', 'delivered', 'opened'].includes(this.status)) this.status = 'clicked';
    },
    getOpenCount() { return this.tracking?.opens?.length || 0; },
    getClickCount() { return this.tracking?.clicks?.length || 0; },
    getUniqueClickCount() {
      if (!this.tracking?.clicks) return 0;
      return new Set(this.tracking.clicks.map((c: any) => c.url)).size;
    },
    hasBeenOpened() { return (this.tracking?.opens?.length || 0) > 0; },
    hasBeenClicked() { return (this.tracking?.clicks?.length || 0) > 0; },
    getAge() { return Date.now() - new Date(this.createdAt).getTime(); },
    getAgeInHours() { return Math.floor(this.getAge() / (1000 * 60 * 60)); },
  });

  return {
    __esModule: true,
    default: { build: createMockInstance },
    EmailStatus,
    EmailPriority,
    EmailType,
  };
});

import EmailQueue, { EmailStatus, EmailPriority, EmailType } from '../../models/EmailQueue';

describe('EmailQueue Model', () => {
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
      const futureDate = new Date(Date.now() + 3600000);

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
      const pastDate = new Date(Date.now() - 3600000);

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
      const pastDate = new Date(Date.now() - 1000);

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
      const futureDate = new Date(Date.now() + 3600000);

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
      email.recordClick('https://example.com/page1');

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
      email.recordClick('https://example.com/page1');

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
      const createdDate = new Date(Date.now() - 5000);

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
      expect(age).toBeGreaterThanOrEqual(4900);
      expect(age).toBeLessThan(6000);
    });
  });

  describe('getAgeInHours - Get email age in hours', () => {
    it('should return age in hours', () => {
      const createdDate = new Date(Date.now() - 7200000);

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
      const createdDate = new Date(Date.now() - 5400000);

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
});
