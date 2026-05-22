import { vi, beforeEach, describe, it, expect } from 'vitest';

/**
 * Defense-in-depth: even though jobs are enqueued from authenticated
 * controllers that have already authorised the action, the worker
 * re-verifies that the requesting user still exists and still has
 * edit access to the saved report at execution time. This protects
 * against future "retry job" admin tooling, payload tampering, and
 * queue replays following permission revocation.
 *
 * The worker handlers are exercised via the `__test__` export — the
 * BullMQ wrapper itself is out of scope here; we drive the same
 * functions BullMQ would.
 */

vi.mock('../../lib/queue', () => ({
  isQueueAvailable: vi.fn(() => false),
  getReportsQueue: vi.fn(),
  buildWorker: vi.fn(),
}));

vi.mock('../../models/SavedReport', () => ({
  __esModule: true,
  default: { findByPk: vi.fn() },
}));

vi.mock('../../models/ScheduledReport', () => ({
  __esModule: true,
  default: { findByPk: vi.fn() },
  ScheduledReportFormat: { PDF: 'pdf', CSV: 'csv', INLINE_HTML: 'inline-html' },
  ScheduledReportStatus: { PENDING: 'pending', SUCCESS: 'success', FAILED: 'failed' },
}));

vi.mock('../../models/User', () => ({
  __esModule: true,
  default: { findByPk: vi.fn() },
  UserStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
    DEACTIVATED: 'deactivated',
  },
  UserType: {
    ADOPTER: 'adopter',
    RESCUE_STAFF: 'rescue_staff',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    SUPER_ADMIN: 'super_admin',
    SUPPORT_AGENT: 'support_agent',
  },
}));

vi.mock('../../services/reports.service', () => ({
  ReportsService: {
    executeReport: vi.fn(),
    canEdit: vi.fn(),
  },
}));

vi.mock('../../services/report-renderer.service', () => ({
  ReportRenderer: {
    renderInlineHtml: vi.fn(() => '<p>html</p>'),
    renderPdf: vi.fn(),
    renderCsv: vi.fn(),
  },
}));

vi.mock('../../services/email.service', () => ({
  default: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

import SavedReport from '../../models/SavedReport';
import ScheduledReport from '../../models/ScheduledReport';
import User, { UserType } from '../../models/User';
import emailService from '../../services/email.service';
import { ReportsService } from '../../services/reports.service';
import { __testables } from '../../workers/reports.worker';

const { handleRenderAndEmail, handleScheduledRun, ScheduledRunJobSchema, RenderAndEmailJobSchema } =
  __testables;

const baseExecuted = { widgets: [], filters: {}, computedAt: '2026-01-01T00:00:00Z' };

describe('reports.worker: handleRenderAndEmail ownership re-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ReportsService.executeReport as ReturnType<typeof vi.fn>).mockResolvedValue(baseExecuted);
  });

  it('renders and emails when the requesting user still has edit access', async () => {
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'user-1',
      rescue_id: null,
      name: 'Report',
      config: {},
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      userType: UserType.ADOPTER,
    });
    (ReportsService.canEdit as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await handleRenderAndEmail({
      savedReportId: 'report-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      triggeredBy: 'schedule',
      requestedBy: 'user-1',
    });

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('skips without sending when the requesting user has been deleted', async () => {
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'user-1',
      rescue_id: null,
      name: 'Report',
      config: {},
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await handleRenderAndEmail({
      savedReportId: 'report-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      triggeredBy: 'schedule',
      requestedBy: 'user-1',
    });

    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(ReportsService.executeReport).not.toHaveBeenCalled();
  });

  it('skips when the requesting user no longer has edit access to the report', async () => {
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'someone-else',
      rescue_id: null,
      name: 'Report',
      config: {},
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      userType: UserType.ADOPTER,
    });
    (ReportsService.canEdit as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await handleRenderAndEmail({
      savedReportId: 'report-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      triggeredBy: 'schedule',
      requestedBy: 'user-1',
    });

    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(ReportsService.executeReport).not.toHaveBeenCalled();
  });

  it('skips when the report no longer exists', async () => {
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      userType: UserType.ADOPTER,
    });

    await handleRenderAndEmail({
      savedReportId: 'report-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      triggeredBy: 'schedule',
      requestedBy: 'user-1',
    });

    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(ReportsService.executeReport).not.toHaveBeenCalled();
  });

  it('bypasses canEdit for admin users (mirrors route admin-bypass policy)', async () => {
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'other-user',
      rescue_id: null,
      name: 'Report',
      config: {},
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'admin-user',
      userType: UserType.ADMIN,
    });
    (ReportsService.canEdit as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await handleRenderAndEmail({
      savedReportId: 'report-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      triggeredBy: 'schedule',
      requestedBy: 'admin-user',
    });

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('reports.worker: handleScheduledRun ownership re-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues render-and-email when the schedule creator still has edit access', async () => {
    const enqueueSpy = vi.fn().mockResolvedValue(undefined);
    const { getReportsQueue, isQueueAvailable } = await import('../../lib/queue');
    (isQueueAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getReportsQueue as ReturnType<typeof vi.fn>).mockReturnValue({ add: enqueueSpy });

    const save = vi.fn().mockResolvedValue(undefined);
    (ScheduledReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      schedule_id: 'sched-1',
      saved_report_id: 'report-1',
      is_enabled: true,
      created_by: 'user-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      save,
    });
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'user-1',
      rescue_id: null,
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      userType: UserType.ADOPTER,
    });
    (ReportsService.canEdit as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await handleScheduledRun({ scheduleId: 'sched-1' });

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const enqueued = enqueueSpy.mock.calls[0][1] as { requestedBy?: string };
    expect(enqueued.requestedBy).toBe('user-1');
  });

  it('does not enqueue render-and-email when the schedule creator has been deleted', async () => {
    const enqueueSpy = vi.fn().mockResolvedValue(undefined);
    const { getReportsQueue, isQueueAvailable } = await import('../../lib/queue');
    (isQueueAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getReportsQueue as ReturnType<typeof vi.fn>).mockReturnValue({ add: enqueueSpy });

    const save = vi.fn().mockResolvedValue(undefined);
    (ScheduledReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      schedule_id: 'sched-1',
      saved_report_id: 'report-1',
      is_enabled: true,
      created_by: 'user-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      save,
    });
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'user-1',
      rescue_id: null,
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await handleScheduledRun({ scheduleId: 'sched-1' });

    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('does not enqueue when the schedule creator no longer has edit access', async () => {
    const enqueueSpy = vi.fn().mockResolvedValue(undefined);
    const { getReportsQueue, isQueueAvailable } = await import('../../lib/queue');
    (isQueueAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getReportsQueue as ReturnType<typeof vi.fn>).mockReturnValue({ add: enqueueSpy });

    const save = vi.fn().mockResolvedValue(undefined);
    (ScheduledReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      schedule_id: 'sched-1',
      saved_report_id: 'report-1',
      is_enabled: true,
      created_by: 'user-1',
      recipients: [{ email: 'a@b.c' }],
      format: 'inline-html',
      save,
    });
    (SavedReport.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      saved_report_id: 'report-1',
      user_id: 'someone-else',
      rescue_id: null,
    });
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      userType: UserType.ADOPTER,
    });
    (ReportsService.canEdit as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await handleScheduledRun({ scheduleId: 'sched-1' });

    expect(enqueueSpy).not.toHaveBeenCalled();
  });
});

describe('reports.worker: job payload schemas reject malformed input at execution time', () => {
  it('accepts a valid scheduled-run payload', () => {
    expect(ScheduledRunJobSchema.safeParse({ scheduleId: 'sched-1' }).success).toBe(true);
  });

  it('rejects scheduled-run payload missing scheduleId', () => {
    expect(ScheduledRunJobSchema.safeParse({}).success).toBe(false);
  });

  it('rejects scheduled-run payload with empty scheduleId', () => {
    expect(ScheduledRunJobSchema.safeParse({ scheduleId: '' }).success).toBe(false);
  });

  it('accepts a valid render-and-email payload', () => {
    expect(
      RenderAndEmailJobSchema.safeParse({
        savedReportId: 'r-1',
        recipients: [{ email: 'recipient@example.com' }],
        format: 'pdf',
        triggeredBy: 'schedule',
      }).success
    ).toBe(true);
  });

  it('rejects render-and-email payload with invalid recipient email', () => {
    expect(
      RenderAndEmailJobSchema.safeParse({
        savedReportId: 'r-1',
        recipients: [{ email: 'not-an-email' }],
        format: 'pdf',
        triggeredBy: 'schedule',
      }).success
    ).toBe(false);
  });

  it('rejects render-and-email payload with unknown format', () => {
    expect(
      RenderAndEmailJobSchema.safeParse({
        savedReportId: 'r-1',
        recipients: [{ email: 'recipient@example.com' }],
        format: 'docx',
        triggeredBy: 'schedule',
      }).success
    ).toBe(false);
  });

  it('rejects render-and-email payload with unknown trigger source', () => {
    expect(
      RenderAndEmailJobSchema.safeParse({
        savedReportId: 'r-1',
        recipients: [{ email: 'recipient@example.com' }],
        format: 'pdf',
        triggeredBy: 'attacker',
      }).success
    ).toBe(false);
  });
});
