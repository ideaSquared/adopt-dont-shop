// Prometheus metrics — substrate only.
//
// Three default instruments shared by every service:
//   - http_request_duration_seconds{method, route, status_code}
//     auto-recorded from a Fastify onResponse hook (registerMetrics).
//   - grpc_handler_duration_seconds{service, method, code, direction}
//     auto-recorded by the gRPC adapter wrappers in each service +
//     the gateway's gRPC clients (direction="in" vs "out").
//   - process metrics via collectDefaultMetrics() — Node memory/GC/CPU.
//
// No domain-specific metrics here. Services annotate their own hot
// paths in a follow-up PR.

import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
  type LabelValues,
} from 'prom-client';
import type { FastifyInstance } from 'fastify';

// Single shared registry — every service mounts this on /metrics. A
// future multi-collector setup can swap to mergeRegistries() but this
// works for the one-process-one-service shape we have today.
let registry: Registry | null = null;
let httpHistogram: Histogram<string> | null = null;
let grpcHistogram: Histogram<string> | null = null;
let defaultsCollected = false;

const HTTP_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const GRPC_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

export const getMetricsRegistry = (): Registry => {
  if (registry) {
    return registry;
  }
  registry = new Registry();
  httpHistogram = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds.',
    labelNames: ['method', 'route', 'status_code'],
    buckets: HTTP_BUCKETS,
    registers: [registry],
  });
  grpcHistogram = new Histogram({
    name: 'grpc_handler_duration_seconds',
    help: 'gRPC handler latency in seconds.',
    labelNames: ['service', 'method', 'code', 'direction'],
    buckets: GRPC_BUCKETS,
    registers: [registry],
  });
  if (!defaultsCollected) {
    collectDefaultMetrics({ register: registry });
    defaultsCollected = true;
  }
  return registry;
};

const getHttpHistogram = (): Histogram<string> => {
  getMetricsRegistry();
  if (!httpHistogram) {
    throw new Error('http histogram not initialised');
  }
  return httpHistogram;
};

const getGrpcHistogram = (): Histogram<string> => {
  getMetricsRegistry();
  if (!grpcHistogram) {
    throw new Error('grpc histogram not initialised');
  }
  return grpcHistogram;
};

export type GrpcDirection = 'in' | 'out';

export type RecordGrpcOptions = {
  service: string;
  method: string;
  // grpc-js numeric status code (status.OK = 0, …). Cast to string for
  // the label so it lands as e.g. `code="0"` in Prometheus.
  code: number;
  direction: GrpcDirection;
  durationSeconds: number;
};

export const recordGrpcDuration = (opts: RecordGrpcOptions): void => {
  const labels: LabelValues<string> = {
    service: opts.service,
    method: opts.method,
    code: String(opts.code),
    direction: opts.direction,
  };
  getGrpcHistogram().observe(labels, opts.durationSeconds);
};

// Fastify plugin — registers the /metrics route + an onResponse hook
// that records every request into http_request_duration_seconds.
// Idempotent: callers register once at boot.
export const registerMetrics = (app: FastifyInstance): void => {
  const reg = getMetricsRegistry();
  const histogram = getHttpHistogram();

  app.addHook('onResponse', (req, reply, done) => {
    // routeOptions.url is the templated path ("/api/v1/users/:userId"),
    // not the resolved URL — that's the right label for a histogram
    // because it bounds cardinality. Fall back to req.url for the
    // handful of edge cases where Fastify can't resolve a route.
    const route = req.routeOptions?.url ?? req.url;
    histogram.observe(
      {
        method: req.method,
        route,
        status_code: String(reply.statusCode),
      },
      reply.elapsedTime / 1000
    );
    done();
  });

  app.get('/metrics', async (_req, reply) => {
    void reply.header('Content-Type', 'text/plain; version=0.0.4');
    return reg.metrics();
  });
};

// --- Test-only helpers ---------------------------------------------

// Vitest needs to reset the registry between suites so cross-test
// state doesn't leak. Not exported from index.ts — internal contract.
export const __resetMetricsForTest = (): void => {
  registry = null;
  httpHistogram = null;
  grpcHistogram = null;
  defaultsCollected = false;
};

export { Counter, Gauge, Histogram, Registry };
