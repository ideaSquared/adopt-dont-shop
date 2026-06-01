import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import sequelize from '../../sequelize';
import EmailQueue, { EmailType, EmailPriority, EmailStatus } from '../../models/EmailQueue';
import User, { UserType, UserStatus } from '../../models/User';
import { EmailService } from '../../services/email.service';

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

vi.unmock('../../services/email.service');

type EmailServiceInternals = EmailService & {
  processEmailQueue: () => Promise<void>;
  setProvider: (provider: unknown) => void;
};

const makeSlowProvider = (latencyMs: number, tracker: { peak: number; current: number }) => {
  return {
    name: 'test-slow',
    getName: () => 'test-slow',
    send: vi.fn(async () => {
      tracker.current += 1;
      tracker.peak = Math.max(tracker.peak, tracker.current);
      try {
        await new Promise(resolve => setTimeout(resolve, latencyMs));
        return { success: true, messageId: 'mid' };
      } finally {
        tracker.current -= 1;
      }
    }),
    sendBulk: vi.fn(),
  };
};

describe('EmailService.processEmailQueue concurrency [ADS-477]', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });

    await User.create({
      userId: 'admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User',
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
    });
  });

  afterEach(async () => {
    delete process.env.EMAIL_QUEUE_CONCURRENCY;
    await EmailQueue.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    vi.clearAllMocks();
  });

  const enqueue = async (count: number) => {
    for (let i = 0; i < count; i += 1) {
      // Use sequential creates so emailId / fromEmail defaults populate
      // properly under SQLite (bulkCreate skips some validations).

      await EmailQueue.create({
        toEmail: `r${i}@test.com`,
        fromEmail: 'noreply@test.com',
        subject: `s${i}`,
        htmlContent: '<p>x</p>',
        textContent: 'x',
        type: EmailType.TRANSACTIONAL,
        status: EmailStatus.QUEUED,
        priority: EmailPriority.NORMAL,
        createdBy: 'admin',
        ccEmails: [],
        bccEmails: [],
        attachments: [],
        templateData: {},
        attempts: 0,
        maxAttempts: 3,
      } as any);
    }
  };

  it('reclaims SENDING rows whose worker crashed mid-send (older than the threshold)', async () => {
    // Worker dies after markAsSending+save but before markAsSent.
    // Without the reaper the row would stay SENDING forever and the
    // email would silently be lost — processEmailQueue only ever pulls
    // QUEUED rows.
    const tracker = { peak: 0, current: 0 };
    const provider = makeSlowProvider(0, tracker);

    const service = new EmailService() as EmailServiceInternals;
    await new Promise(resolve => setImmediate(resolve));
    service.setProvider(provider);

    // Stale SENDING row — lastAttemptAt 10 minutes ago (well past the
    // 5-minute floor).
    await EmailQueue.create({
      toEmail: 'stuck@test.com',
      fromEmail: 'noreply@test.com',
      subject: 'stuck',
      htmlContent: '<p>x</p>',
      textContent: 'x',
      type: EmailType.TRANSACTIONAL,
      status: EmailStatus.SENDING,
      priority: EmailPriority.NORMAL,
      createdBy: 'admin',
      ccEmails: [],
      bccEmails: [],
      attachments: [],
      templateData: {},
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000),
    } as any);

    // Fresh SENDING row — only 30s old, must NOT be reclaimed (a real
    // worker may still be talking to the provider).
    await EmailQueue.create({
      toEmail: 'fresh@test.com',
      fromEmail: 'noreply@test.com',
      subject: 'fresh',
      htmlContent: '<p>x</p>',
      textContent: 'x',
      type: EmailType.TRANSACTIONAL,
      status: EmailStatus.SENDING,
      priority: EmailPriority.NORMAL,
      createdBy: 'admin',
      ccEmails: [],
      bccEmails: [],
      attachments: [],
      templateData: {},
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: new Date(Date.now() - 30 * 1000),
    } as any);

    await service.processEmailQueue();

    // Stuck row was reclaimed (QUEUED) then sent on the same loop tick.
    const stuck = await EmailQueue.findOne({ where: { toEmail: 'stuck@test.com' } });
    expect(stuck?.status).toBe(EmailStatus.SENT);

    // Fresh row was left alone.
    const fresh = await EmailQueue.findOne({ where: { toEmail: 'fresh@test.com' } });
    expect(fresh?.status).toBe(EmailStatus.SENDING);
  });

  it('processes a batch in parallel up to EMAIL_QUEUE_CONCURRENCY', async () => {
    process.env.EMAIL_QUEUE_CONCURRENCY = '4';
    const tracker = { peak: 0, current: 0 };
    const provider = makeSlowProvider(50, tracker);

    const service = new EmailService() as EmailServiceInternals;
    // The constructor kicks off async provider init; let it settle so
    // it doesn't clobber the test provider we install below.
    await new Promise(resolve => setImmediate(resolve));
    service.setProvider(provider);

    await enqueue(8);
    const queuedCount = await EmailQueue.count({ where: { status: EmailStatus.QUEUED } });
    expect(queuedCount).toBe(8);

    const start = Date.now();
    await service.processEmailQueue();
    const elapsed = Date.now() - start;

    // 8 emails @ 50ms with 4 concurrent workers => ~100ms (2 waves).
    // Generous bound to keep CI stable.
    expect(elapsed).toBeLessThan(400);
    expect(tracker.peak).toBeLessThanOrEqual(4);
    expect(tracker.peak).toBeGreaterThan(1);

    const sentCount = await EmailQueue.count({ where: { status: EmailStatus.SENT } });
    expect(sentCount).toBe(8);
  });

  it('defaults to 5 concurrent workers when EMAIL_QUEUE_CONCURRENCY is unset', async () => {
    delete process.env.EMAIL_QUEUE_CONCURRENCY;
    const tracker = { peak: 0, current: 0 };
    const provider = makeSlowProvider(40, tracker);

    const service = new EmailService() as EmailServiceInternals;
    // The constructor kicks off async provider init; let it settle so
    // it doesn't clobber the test provider we install below.
    await new Promise(resolve => setImmediate(resolve));
    service.setProvider(provider);

    await enqueue(10);

    await service.processEmailQueue();

    expect(tracker.peak).toBeLessThanOrEqual(5);
    expect(tracker.peak).toBeGreaterThan(1);
  });

  it('isolates failures so one bad send does not stop the batch', async () => {
    process.env.EMAIL_QUEUE_CONCURRENCY = '2';

    let sendCount = 0;
    const provider = {
      name: 'test-mixed',
      getName: () => 'test-mixed',
      send: vi.fn(async () => {
        sendCount += 1;
        if (sendCount === 2) {
          throw new Error('boom');
        }
        return { success: true, messageId: 'mid' };
      }),
      sendBulk: vi.fn(),
    };

    const service = new EmailService() as EmailServiceInternals;
    // The constructor kicks off async provider init; let it settle so
    // it doesn't clobber the test provider we install below.
    await new Promise(resolve => setImmediate(resolve));
    service.setProvider(provider);

    await enqueue(4);
    await service.processEmailQueue();

    // 3 succeeded, 1 failed — none stuck in QUEUED.
    const queued = await EmailQueue.count({ where: { status: EmailStatus.QUEUED } });
    expect(queued).toBe(0);
  });
});
