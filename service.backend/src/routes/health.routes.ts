import { Request, Response, Router } from 'express';
import { HealthCheckService } from '../services/health-check.service';
import { logger } from '../utils/logger';

/**
 * ADS-446 / ADS-460: readiness endpoint.
 *
 * Probes database, Redis, and BullMQ. Any unhealthy probe drops the pod
 * out of the load balancer (returns 503), so a Redis or queue outage no
 * longer passes silently while the pod still serves traffic.
 */
const router = Router();

const ready = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [database, redis, queue] = await Promise.all([
      HealthCheckService.checkDatabaseHealth(),
      HealthCheckService.checkRedisHealth(),
      HealthCheckService.checkQueueHealth(),
    ]);

    const failures: { service: string; details?: string }[] = [];
    if (database.status === 'unhealthy') {
      failures.push({ service: 'database', details: database.details });
    }
    if (redis.status === 'unhealthy') {
      failures.push({ service: 'redis', details: redis.details });
    }
    if (queue.status === 'unhealthy') {
      failures.push({ service: 'queue', details: queue.details });
    }

    if (failures.length > 0) {
      res.status(503).json({ status: 'not ready', failures, timestamp: new Date() });
      return;
    }

    res.status(200).json({ status: 'ready', timestamp: new Date() });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ status: 'not ready', reason: 'health check failed' });
  }
};

router.get('/ready', ready);
router.get('/health/ready', ready);

export default router;
