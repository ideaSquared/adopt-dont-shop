import type { Worker } from 'bullmq';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import { ReportsService } from '../services/reports.service';
import { ReportRenderer } from '../services/report-renderer.service';
import emailService from '../services/email.service';
import SavedReport from '../models/SavedReport';
import ScheduledReport, {
  ScheduledReportFormat,
  ScheduledReportStatus,
  type ScheduledReportRecipient,
} from '../models/ScheduledReport';
import { logger } from '../utils/logger';
import type { ReportConfig } from '../schemas/reports.schema';

/**
 * ADS-105: BullMQ worker for scheduled-report runs.
 *
 * Two job types live in the same `reports` queue:
 *
 *   1. report:scheduled-run
 *      Created as a BullMQ repeatable, keyed by ScheduledReport.id.
 *      Loads the schedule + report, runs the report, then enqueues a
 *      render-and-email job. This split keeps the cron tick fast and
 *      lets render failures retry independently.
 *
 *   2. report:render-and-email
 *      Renders the executed payload (PDF/CSV/inline-html) and pushes
 *      it through the existing emailService. Updates the schedule's
 *      last_status / last_error so admins can see failures in the UI.
 *
 * The worker is gated by `WORKER_ENABLED=true` env var so production
 * can decide whether the API process or a dedicated worker process
 * runs jobs.
 */

export type ScheduledRunJob = {
  scheduleId: string;
};

export type RenderAndEmailJob = {
  savedReportId: string;
  scheduleId?: string;
  recipients: ScheduledReportRecipient[];
  format: ScheduledReportFormat;
  triggeredBy: 'schedule' | 'manual';
};

const SCHEDULED_RUN = 'report:scheduled-run';
const RENDER_AND_EMAIL = 'report:render-and-email';

export const repeatJobKeyFor = (scheduleId: string): string => `scheduled-run:${scheduleId}`;

/**
 * Add or update the BullMQ repeatable for a schedule. Returns the
 * repeat-job key so the caller can persist it on the schedule row
 * (used to remove the repeatable on delete/disable).
 */
export const enqueueScheduleRepeat = async (schedule: ScheduledReport): Promise<string> => {
  if (!isQueueAvailable()) {
    logger.warn('Queue unavailable — schedule will not run', {
      scheduleId: schedule.schedule_id,
    });
    return repeatJobKeyFor(schedule.schedule_id);
  }
  const queue = getReportsQueue();
  const jobId = repeatJobKeyFor(schedule.schedule_id);
  // Clean up any previous repeat (cron change → must re-create).
  if (schedule.repeat_job_key) {
    await queue.removeRepeatableByKey(schedule.repeat_job_key).catch(() => undefined);
  }
  await queue.add(SCHEDULED_RUN, { scheduleId: schedule.schedule_id } satisfies ScheduledRunJob, {
    jobId,
    repeat: { pattern: schedule.cron, tz: schedule.timezone },
  });
  return jobId;
};

export const removeScheduleRepeat = async (schedule: ScheduledReport): Promise<void> => {
  if (!isQueueAvailable() || !schedule.repeat_job_key) {
    return;
  }
  const queue = getReportsQueue();
  await queue.removeRepeatableByKey(schedule.repeat_job_key).catch(err => {
    logger.warn('Failed to remove repeatable', {
      scheduleId: schedule.schedule_id,
      error: err instanceof Error ? err.message : String(err),
    });
  });
};

const handleScheduledRun = async (data: ScheduledRunJob): Promise<void> => {
  const schedule = await ScheduledReport.findByPk(data.scheduleId);
  if (!schedule || !schedule.is_enabled) {
    logger.debug('Schedule missing or disabled — skipping', { scheduleId: data.scheduleId });
    return;
  }
  schedule.last_status = ScheduledReportStatus.PENDING;
  schedule.last_run_at = new Date();
  await schedule.save();

  await getReportsQueue().add(RENDER_AND_EMAIL, {
    savedReportId: schedule.saved_report_id,
    scheduleId: schedule.schedule_id,
    recipients: schedule.recipients,
    format: schedule.format,
    triggeredBy: 'schedule',
  } satisfies RenderAndEmailJob);
};

const handleRenderAndEmail = async (data: RenderAndEmailJob): Promise<void> => {
  const report = await SavedReport.findByPk(data.savedReportId);
  if (!report) {
    throw new Error(`Report ${data.savedReportId} not found for render-and-email`);
  }
  const scope: string | 'platform' = report.rescue_id ?? 'platform';
  const executed = await ReportsService.executeReport(report.config as unknown as ReportConfig, {
    scope,
    userId: report.user_id,
  });

  const subject = `Report: ${report.name}`;
  let html: string;
  // emailService expects FileAttachment with base64 string content.
  let attachment: { filename: string; content: string; contentType: string; size: number } | null =
    null;
  const safeName = report.name.replace(/[^a-z0-9-_]+/gi, '_');

  if (data.format === ScheduledReportFormat.INLINE_HTML) {
    html = ReportRenderer.renderInlineHtml(report, executed);
  } else {
    html = `<p>Your scheduled report &quot;${report.name}&quot; is attached.</p>`;
    if (data.format === ScheduledReportFormat.PDF) {
      const buf = await ReportRenderer.renderPdf(report, executed);
      attachment = {
        filename: `${safeName}.pdf`,
        content: buf.toString('base64'),
        contentType: 'application/pdf',
        size: buf.length,
      };
    } else {
      const buf = ReportRenderer.renderCsv(report, executed);
      attachment = {
        filename: `${safeName}.csv`,
        content: buf.toString('base64'),
        contentType: 'text/csv',
        size: buf.length,
      };
    }
  }

  for (const r of data.recipients) {
    await emailService.sendEmail({
      toEmail: r.email,
      subject,
      htmlContent: html,
      attachments: attachment ? [attachment] : undefined,
      userId: r.userId,
    });
  }

  if (data.scheduleId) {
    const schedule = await ScheduledReport.findByPk(data.scheduleId);
    if (schedule) {
      schedule.last_status = ScheduledReportStatus.SUCCESS;
      schedule.last_error = null;
      await schedule.save();
    }
  }
};

let workerInstance: Worker<ScheduledRunJob | RenderAndEmailJob> | null = null;

/**
 * Start the worker. Idempotent — calling twice returns the same
 * Worker instance.
 */
export const startReportsWorker = (): Worker<ScheduledRunJob | RenderAndEmailJob> | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — reports worker not started');
    return null;
  }
  workerInstance = buildWorker<ScheduledRunJob | RenderAndEmailJob, void>(async job => {
    if (job.name === SCHEDULED_RUN) {
      await handleScheduledRun(job.data as ScheduledRunJob);
    } else if (job.name === RENDER_AND_EMAIL) {
      await handleRenderAndEmail(job.data as RenderAndEmailJob);
    } else {
      logger.warn('Unknown reports-worker job name', { jobName: job.name });
    }
  });
  workerInstance.on('failed', async (job, err) => {
    if (job?.name === RENDER_AND_EMAIL) {
      const data = job.data as RenderAndEmailJob;
      if (data.scheduleId) {
        const schedule = await ScheduledReport.findByPk(data.scheduleId).catch(() => null);
        if (schedule) {
          schedule.last_status = ScheduledReportStatus.FAILED;
          schedule.last_error = err.message.slice(0, 1000);
          await schedule.save().catch(() => undefined);
        }
      }
    }
  });
  return workerInstance;
};

export const stopReportsWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
