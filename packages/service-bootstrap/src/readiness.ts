// Dependency-aware readiness probe shared by every gRPC microservice and the
// gateway.
//
// /health/simple is pure liveness — it answers 200 as soon as the process is
// up and (for microservices) the gRPC server has bound. It deliberately does
// NOT reflect downstream health, so a service that has lost its DB pool, NATS
// or Redis still reports 200 there and keeps taking traffic.
//
// /health/ready closes that gap: it actively probes the backing services a
// process depends on (Postgres `SELECT 1`, NATS connection state, Redis PING)
// and answers 503 when any of them is unreachable, so an orchestrator or load
// balancer can stop routing to (or restart) a service that can't serve.

import type { FastifyInstance } from 'fastify';

import type { createLogger } from '@adopt-dont-shop/observability';

type Logger = ReturnType<typeof createLogger>;

// Dependency handles a service hands to the readiness probe. Every field is
// optional — a service wires only the backing services it actually uses, and
// an omitted dependency is simply not probed. Structural (rather than the
// concrete pg/nats/ioredis types) so this stays dependency-light and trivially
// fakeable in tests; a real pg Pool, NatsConnection and ioredis client each
// satisfy the shape.
export type ReadinessDeps = {
  // Postgres primary pool — probed with `SELECT 1`.
  pool?: { query: (text: string) => Promise<unknown> };
  // NATS connection — reported not-ready once the connection has closed.
  nats?: { isClosed: () => boolean };
  // Redis client (ioredis / node-redis both expose this shape) — probed with
  // PING. A failure here makes the service overall not-ready.
  redis?: { ping: () => Promise<unknown> };
  // Like `redis`, but for a Redis instance the caller already degrades
  // gracefully without (e.g. the gateway's rate-limit store, which falls
  // back to in-memory on connection loss — ADS-1046). Reported under the
  // same `redis` check name in the response breakdown so it's visible to
  // operators, but a failure here does NOT flip the overall `ok` to false —
  // pulling a service out of rotation over a dependency it already
  // tolerates losing would be the wrong failure mode. Mutually exclusive
  // with `redis` in practice — a service has one Redis readiness posture,
  // not both.
  redisOptional?: { ping: () => Promise<unknown> };
};

export type ReadinessResult = {
  ok: boolean;
  checks: Record<string, 'ok' | 'error'>;
};

// A single probe gets this long to answer before it is treated as a failure —
// a hung dependency must never hang the readiness endpoint itself.
const DEFAULT_CHECK_TIMEOUT_MS = 2_000;

const withTimeout = async (
  label: string,
  work: Promise<unknown>,
  timeoutMs: number
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} readiness probe timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });
  try {
    await Promise.race([work, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

// Probe every configured dependency concurrently. Each probe is individually
// try/caught so one failing dependency yields `error` for that check rather
// than throwing out of the whole readiness evaluation.
export const checkReadiness = async (
  deps: ReadinessDeps,
  opts: { timeoutMs?: number; logger?: Logger } = {}
): Promise<ReadinessResult> => {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS;

  // `critical: false` reports the check in `checks` for operator visibility
  // without letting its failure flip the overall `ok` — see `redisOptional`.
  const probes: Array<{ name: string; critical: boolean; run: () => Promise<void> }> = [];

  if (deps.pool) {
    const { pool } = deps;
    probes.push({
      name: 'database',
      critical: true,
      run: () => withTimeout('database', pool.query('SELECT 1'), timeoutMs),
    });
  }
  if (deps.nats) {
    const { nats } = deps;
    probes.push({
      name: 'nats',
      critical: true,
      run: async () => {
        if (nats.isClosed()) {
          throw new Error('nats connection is closed');
        }
      },
    });
  }
  if (deps.redis) {
    const { redis } = deps;
    probes.push({
      name: 'redis',
      critical: true,
      run: () => withTimeout('redis', redis.ping(), timeoutMs),
    });
  }
  if (deps.redisOptional) {
    const { redisOptional } = deps;
    probes.push({
      name: 'redis',
      critical: false,
      run: () => withTimeout('redis', redisOptional.ping(), timeoutMs),
    });
  }

  const entries = await Promise.all(
    probes.map(
      async ({ name, critical, run }): Promise<readonly [string, 'ok' | 'error', boolean]> => {
        try {
          await run();
          return [name, 'ok', critical] as const;
        } catch (err) {
          opts.logger?.warn('readiness probe failed', { check: name, err });
          return [name, 'error', critical] as const;
        }
      }
    )
  );

  const checks: Record<string, 'ok' | 'error'> = Object.fromEntries(
    entries.map(([name, status]) => [name, status])
  );
  const ok = entries.every(([, status, critical]) => status === 'ok' || !critical);
  return { ok, checks };
};

export type RegisterReadinessRouteOptions = {
  serviceName: string;
  environment: string;
  deps: ReadinessDeps;
  logger?: Logger;
  timeoutMs?: number;
};

// Register GET /health/ready on a Fastify instance. Answers 200 when every
// probed dependency is reachable, 503 {status:'degraded'} otherwise, with a
// per-dependency breakdown so an operator can see which one is down.
export const registerReadinessRoute = (
  server: FastifyInstance,
  opts: RegisterReadinessRouteOptions
): void => {
  server.get('/health/ready', async (_req, reply) => {
    const result = await checkReadiness(opts.deps, {
      timeoutMs: opts.timeoutMs,
      logger: opts.logger,
    });
    return reply.status(result.ok ? 200 : 503).send({
      status: result.ok ? 'ok' : 'degraded',
      service: opts.serviceName,
      environment: opts.environment,
      checks: result.checks,
    });
  });
};
