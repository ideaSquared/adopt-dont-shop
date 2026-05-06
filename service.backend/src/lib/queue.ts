import { Queue, Worker, type ConnectionOptions, type WorkerOptions } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * ADS-105: BullMQ queue + worker factory.
 *
 * BullMQ requires Redis. We reuse the same connection URL as the
 * cache layer (`REDIS_URL`). When it's missing or unreachable, queue
 * creation throws — callers (the worker bootstrap, the schedule
 * service) must guard with `isQueueAvailable()`.
 *
 * Single shared queue (`reports`) with two job types:
 *   - `report:scheduled-run`   — repeatable, keyed by ScheduledReport.id
 *   - `report:render-and-email` — payload triggered immediately or by the
 *                                  scheduled-run handler
 */

export const REPORTS_QUEUE = 'reports';

let connection: ConnectionOptions | null = null;
let queueInstance: Queue | null = null;

const getConnection = (): ConnectionOptions => {
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is not set; queue is unavailable');
  }
  connection ??= { url: env.REDIS_URL };
  return connection;
};

export const isQueueAvailable = (): boolean => Boolean(env.REDIS_URL);

export const getReportsQueue = (): Queue => {
  if (!queueInstance) {
    queueInstance = new Queue(REPORTS_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 },
      },
    });
  }
  return queueInstance;
};

export const buildWorker = <T = unknown, R = unknown>(
  processor: (job: { data: T; name: string }) => Promise<R>,
  options: Partial<WorkerOptions> = {}
): Worker<T, R> => {
  if (!isQueueAvailable()) {
    throw new Error('Cannot start worker — REDIS_URL not set');
  }
  const worker = new Worker<T, R>(
    REPORTS_QUEUE,
    async job => processor({ data: job.data as T, name: job.name }),
    {
      connection: getConnection(),
      concurrency: 4,
      ...options,
    }
  );
  worker.on('failed', (job, err) => {
    logger.error('Reports worker job failed', {
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });
  worker.on('completed', job => {
    logger.debug('Reports worker job completed', { jobId: job.id, jobName: job.name });
  });
  return worker;
};

/** For graceful shutdown / tests. */
export const closeQueueResources = async (): Promise<void> => {
  if (queueInstance) {
    await queueInstance.close().catch(() => undefined);
    queueInstance = null;
  }
};
