// Resilience wrapper for gateway gRPC clients.
//
// Provides two behaviours, composable per-call:
//
//   1. RETRIES — idempotent RPCs only.
//      Retries on UNAVAILABLE (14) and DEADLINE_EXCEEDED (4) with
//      exponential backoff + jitter. Each attempt gets a fresh deadline.
//      Maximum attempts = 1 + GRPC_RETRY_COUNT (env, default 2).
//      Non-idempotent RPCs are never retried regardless of error.
//
//   2. CIRCUIT BREAKER — per downstream service.
//      After GRPC_CIRCUIT_FAILURES (default 5) failures within a
//      GRPC_CIRCUIT_WINDOW_MS (default 30_000) window the breaker opens.
//      While open, calls are rejected immediately with an UNAVAILABLE-coded
//      error (the gateway's GRPC_TO_HTTP mapping returns 503 for that code).
//      After GRPC_CIRCUIT_COOLDOWN_MS (default 10_000) the breaker enters
//      half-open state and allows one probe through. A successful probe
//      closes the circuit; a failed probe re-opens it.
//
// Metrics:
//   grpc_circuit_state{service} — Gauge: 0=closed, 1=half-open, 2=open.
//   Registered against the prom-client registry supplied at creation
//   (production code passes the default Registry; tests pass a fresh
//   Registry so gauges don't collide across suites).

import { Gauge, Registry, register as defaultRegistry } from 'prom-client';

// ── gRPC status codes we care about ──────────────────────────────────

const STATUS_UNAVAILABLE = 14;
const STATUS_DEADLINE_EXCEEDED = 4;

const RETRYABLE_CODES = new Set([STATUS_UNAVAILABLE, STATUS_DEADLINE_EXCEEDED]);

// Codes that indicate the DOWNSTREAM is unhealthy and so should count
// toward opening the circuit breaker. Client-fault codes
// (INVALID_ARGUMENT, NOT_FOUND, ALREADY_EXISTS, PERMISSION_DENIED,
// UNAUTHENTICATED, FAILED_PRECONDITION, ABORTED, …) are NOT faults: a
// healthy service returning a burst of 404s or expired-token 401s must
// never trip the breaker and 503 normal traffic. An error with no numeric
// gRPC code (a raw transport/connection error) means the downstream
// couldn't be reached and is treated as a fault.
const STATUS_UNKNOWN = 2;
const STATUS_RESOURCE_EXHAUSTED = 8;
const STATUS_INTERNAL = 13;
const STATUS_DATA_LOSS = 15;
const FAULT_CODES = new Set([
  STATUS_UNKNOWN,
  STATUS_DEADLINE_EXCEEDED,
  STATUS_RESOURCE_EXHAUSTED,
  STATUS_INTERNAL,
  STATUS_UNAVAILABLE,
  STATUS_DATA_LOSS,
]);

// ── env-based defaults ────────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = parseInt(process.env['GRPC_RETRY_COUNT'] ?? '2', 10);
const DEFAULT_FAILURE_THRESHOLD = parseInt(process.env['GRPC_CIRCUIT_FAILURES'] ?? '5', 10);
const DEFAULT_WINDOW_MS = parseInt(process.env['GRPC_CIRCUIT_WINDOW_MS'] ?? '30000', 10);
const DEFAULT_COOLDOWN_MS = parseInt(process.env['GRPC_CIRCUIT_COOLDOWN_MS'] ?? '10000', 10);

// ── circuit breaker ───────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open';

type CircuitBreakerCreateOptions = {
  service: string;
  failureThreshold?: number;
  windowMs?: number;
  cooldownMs?: number;
  registry?: Registry;
};

export type CircuitBreaker = {
  /** Records a successful call — closes the circuit if half-open. */
  onSuccess(): void;
  /** Records a failed call — may open the circuit. */
  onFailure(): void;
  /**
   * Returns true when the circuit is open (caller should reject fast).
   * Transitions to half-open when the cooldown has elapsed.
   */
  isOpen(): boolean;
};

// One grpc_circuit_state gauge per registry, shared by every breaker —
// prom-client throws on a second registration of the same metric name, so
// the 10 production clients (all on the default registry) must reuse it.
// The identity check against getSingleMetric handles registries that were
// cleared between tests: a stale cached gauge is re-created, not reused.
const gaugesByRegistry = new WeakMap<Registry, Gauge<'service'>>();

const getOrCreateStateGauge = (reg: Registry): Gauge<'service'> => {
  const cached = gaugesByRegistry.get(reg);
  if (cached && reg.getSingleMetric('grpc_circuit_state') === cached) {
    return cached;
  }
  const gauge = new Gauge({
    name: 'grpc_circuit_state',
    help: 'gRPC circuit breaker state per downstream service (0=closed, 1=half-open, 2=open).',
    labelNames: ['service'],
    registers: [reg],
  });
  gaugesByRegistry.set(reg, gauge);
  return gauge;
};

export const createCircuitBreaker = (createOpts: CircuitBreakerCreateOptions): CircuitBreaker => {
  const failureThreshold = createOpts.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const windowMs = createOpts.windowMs ?? DEFAULT_WINDOW_MS;
  const cooldownMs = createOpts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const reg = createOpts.registry ?? defaultRegistry;

  // Gauge — 0 closed / 1 half-open / 2 open
  const gauge = getOrCreateStateGauge(reg);
  gauge.set({ service: createOpts.service }, 0);

  let state: CircuitState = 'closed';
  let openedAt = 0;
  // Sliding-window failure timestamps
  const failureTimes: number[] = [];

  const setState = (next: CircuitState): void => {
    state = next;
    gauge.set(
      { service: createOpts.service },
      next === 'closed' ? 0 : next === 'half-open' ? 1 : 2
    );
  };

  const pruneWindow = (): void => {
    const cutoff = Date.now() - windowMs;
    while (failureTimes.length > 0 && (failureTimes[0] ?? 0) < cutoff) {
      failureTimes.shift();
    }
  };

  return {
    onSuccess(): void {
      if (state === 'half-open') {
        failureTimes.length = 0;
        setState('closed');
      }
    },

    onFailure(): void {
      const now = Date.now();
      failureTimes.push(now);
      pruneWindow();

      if (state === 'half-open') {
        // Probe failed — re-open and restart cooldown
        openedAt = now;
        setState('open');
        return;
      }

      if (state === 'closed' && failureTimes.length >= failureThreshold) {
        openedAt = now;
        setState('open');
      }
    },

    isOpen(): boolean {
      if (state === 'closed') {
        return false;
      }

      if (state === 'open') {
        const elapsed = Date.now() - openedAt;
        if (elapsed >= cooldownMs) {
          setState('half-open');
          return false; // allow probe
        }
        return true;
      }

      // half-open — allow the probe through
      return false;
    },
  };
};

// ── per-service registry ──────────────────────────────────────────────

// Production clients pass their service name; createDefaultBreaker caches
// one breaker per service in the module-level map so that all calls from
// the same client share state.
const breakersByService = new Map<string, CircuitBreaker>();

export const getOrCreateCircuitBreaker = (service: string): CircuitBreaker => {
  const existing = breakersByService.get(service);
  if (existing) {
    return existing;
  }
  const breaker = createCircuitBreaker({ service });
  breakersByService.set(service, breaker);
  return breaker;
};

// ── call wrapper ──────────────────────────────────────────────────────

export type ResilienceOptions = {
  /** Downstream service name — used for circuit breaker lookup. */
  service: string;
  /** Per-attempt deadline duration in milliseconds. */
  deadlineMs: number;
  /** Maximum number of retries (0 = no retries, only the initial attempt). */
  maxRetries?: number;
  /**
   * Whether this RPC is idempotent — only idempotent RPCs are retried.
   * Defaults to false (safe default: never retry).
   */
  idempotent?: boolean;
  /** Circuit breaker instance. Defaults to the module-level per-service one. */
  circuitBreaker?: CircuitBreaker;
};

// The fn receives the deadline for the attempt so each retry gets a
// freshly-computed Date (never re-uses the first attempt's deadline).
type AttemptFn<T> = (deadline: Date) => Promise<T>;

const isRetryableError = (err: unknown): boolean => {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'number'
  ) {
    return RETRYABLE_CODES.has((err as { code: number }).code);
  }
  return false;
};

// Whether an error indicates the DOWNSTREAM is unhealthy and so should
// count toward opening the circuit breaker. An error carrying one of the
// FAULT_CODES is a fault; client-fault codes (NOT_FOUND, UNAUTHENTICATED,
// INVALID_ARGUMENT, …) are not. An error with no numeric gRPC code is a
// raw transport/connection failure — the downstream couldn't be reached,
// which IS a fault.
const isFaultError = (err: unknown): boolean => {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'number'
  ) {
    return FAULT_CODES.has((err as { code: number }).code);
  }
  return true;
};

const makeUnavailableError = (): Error & { code: number } => {
  const err = new Error('circuit breaker open — service unavailable') as Error & { code: number };
  err.code = STATUS_UNAVAILABLE;
  return err;
};

// Exponential backoff with full jitter: sleep = rand(0, base * 2^attempt)
// base = 50ms, cap at 1s
const backoffMs = (attempt: number): number => {
  const base = 50;
  const cap = 1_000;
  const ceiling = Math.min(base * Math.pow(2, attempt), cap);
  return Math.random() * ceiling;
};

export const callWithResilience = async <T>(
  fn: AttemptFn<T>,
  opts: ResilienceOptions
): Promise<T> => {
  const breaker = opts.circuitBreaker ?? getOrCreateCircuitBreaker(opts.service);
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const idempotent = opts.idempotent ?? false;

  if (breaker.isOpen()) {
    throw makeUnavailableError();
  }

  let lastError: unknown;
  const maxAttempts = 1 + maxRetries;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const deadline = new Date(Date.now() + opts.deadlineMs);
    try {
      const result = await fn(deadline);
      breaker.onSuccess();
      return result;
    } catch (err: unknown) {
      lastError = err;
      // Only downstream-health faults trip the breaker. A burst of benign
      // client-fault errors (404s, expired-token 401s) from a healthy
      // service must never open the circuit and 503 normal traffic.
      if (isFaultError(err)) {
        breaker.onFailure();
      }

      const shouldRetry = idempotent && isRetryableError(err) && attempt < maxAttempts - 1;
      if (!shouldRetry) {
        throw err;
      }

      // Wait before next attempt; also re-check the circuit
      const delay = backoffMs(attempt);
      if (delay > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }

      if (breaker.isOpen()) {
        throw makeUnavailableError();
      }
    }
  }

  throw lastError;
};
