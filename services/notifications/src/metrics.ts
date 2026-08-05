// Notifications service custom metrics (ADS-1052).
//
// Two Prometheus counters surface failures that were previously log-only:
//   notifications_scheduled_job_failures_total{job}   — a scheduled job's
//     run() threw (e.g. the weekly digest failed for one cadence).
//   notifications_email_failures_total{reason}        — an email failed to
//     send. reason="provider" (the provider returned success=false) or
//     reason="dispatch" (dispatching threw before/around the provider call).
//
// Both are registered on the shared observability registry so they appear on
// the existing /metrics endpoint. Mirrors the audit service's gdpr-metrics
// module: module-level singletons guarded so prom-client never sees a
// duplicate registration in the same process.

import { Counter, getMetricsRegistry } from '@adopt-dont-shop/observability';

let _jobFailures: InstanceType<typeof Counter<'job'>> | null = null;
let _emailFailures: InstanceType<typeof Counter<'reason'>> | null = null;

const getJobFailureCounter = (): InstanceType<typeof Counter<'job'>> => {
  if (_jobFailures) {
    return _jobFailures;
  }
  _jobFailures = new Counter<'job'>({
    name: 'notifications_scheduled_job_failures_total',
    help: 'Total scheduled-job run failures, by job name.',
    labelNames: ['job'],
    registers: [getMetricsRegistry()],
  });
  return _jobFailures;
};

// recordScheduledJobFailure increments the counter when a scheduled job's
// run() throws.
export const recordScheduledJobFailure = (job: string): void => {
  getJobFailureCounter().inc({ job });
};

export type EmailFailureReason = 'provider' | 'dispatch';

const getEmailFailureCounter = (): InstanceType<typeof Counter<'reason'>> => {
  if (_emailFailures) {
    return _emailFailures;
  }
  _emailFailures = new Counter<'reason'>({
    name: 'notifications_email_failures_total',
    help: 'Total email send failures, by reason (provider | dispatch).',
    labelNames: ['reason'],
    registers: [getMetricsRegistry()],
  });
  return _emailFailures;
};

// recordEmailFailure increments the counter when an email fails to send.
export const recordEmailFailure = (reason: EmailFailureReason): void => {
  getEmailFailureCounter().inc({ reason });
};

// --- Test-only helper -------------------------------------------------------

export const __resetNotificationsMetricsForTest = (): void => {
  _jobFailures = null;
  _emailFailures = null;
};
