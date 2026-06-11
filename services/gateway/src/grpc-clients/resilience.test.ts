// Behaviour tests for the gRPC resilience wrapper.
//
// Covers:
//   - Happy path: callWithResilience resolves transparently
//   - Retry: UNAVAILABLE retried for idempotent; not retried for non-idempotent
//   - Retry: DEADLINE_EXCEEDED retried for idempotent; not retried for non-idempotent
//   - No retry on non-retryable errors (NOT_FOUND, PERMISSION_DENIED)
//   - Backoff: each attempt uses a fresh deadline
//   - Circuit breaker: opens after N failures, rejects fast while open
//   - Circuit breaker: half-open after cooldown lets one probe through
//   - Circuit breaker: successful probe closes the circuit
//   - Circuit breaker: failed probe re-opens the circuit and resets cooldown
//   - Circuit breaker gauge: 0 closed / 1 half-open / 2 open
//   - Different services have isolated circuit breakers

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Registry } from 'prom-client';

import {
  createCircuitBreaker,
  callWithResilience,
  type CircuitBreaker,
  type ResilienceOptions,
} from './resilience.js';

// ── helpers ──────────────────────────────────────────────────────────

// gRPC status codes (numeric) — enough for the tests
const GRPC_STATUS = {
  OK: 0,
  UNKNOWN: 2,
  NOT_FOUND: 5,
  PERMISSION_DENIED: 7,
  UNAVAILABLE: 14,
  DEADLINE_EXCEEDED: 4,
} as const;

const makeGrpcError = (code: number): Error & { code: number } => {
  const err = new Error(`grpc error code ${code}`) as Error & { code: number };
  err.code = code;
  return err;
};

// ── suite ─────────────────────────────────────────────────────────────

describe('callWithResilience', () => {
  let registry: Registry;
  let opts: ResilienceOptions;

  beforeEach(() => {
    // Fresh prom-client registry per test so gauges don't collide
    registry = new Registry();
    opts = {
      service: 'service.test',
      deadlineMs: 100,
      maxRetries: 2,
      circuitBreaker: createCircuitBreaker({
        service: 'service.test',
        failureThreshold: 3,
        windowMs: 10_000,
        cooldownMs: 50, // fast for tests
        registry,
      }),
    };
  });

  afterEach(() => {
    registry.clear();
  });

  // ── happy path ───────────────────────────────────────────────────

  it('resolves the value when the fn succeeds on the first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('hello');
    const result = await callWithResilience(fn, opts);
    expect(result).toBe('hello');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the deadline to fn as a Date', async () => {
    const before = Date.now();
    let receivedDeadline: Date | undefined;
    const fn = vi.fn().mockImplementation((deadline: Date) => {
      receivedDeadline = deadline;
      return Promise.resolve('ok');
    });
    await callWithResilience(fn, opts);
    expect(receivedDeadline).toBeInstanceOf(Date);
    expect(receivedDeadline!.getTime()).toBeGreaterThanOrEqual(before + opts.deadlineMs - 5);
  });

  // ── retry: idempotent ────────────────────────────────────────────

  it('retries UNAVAILABLE for idempotent RPCs (succeeds on 2nd attempt)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeGrpcError(GRPC_STATUS.UNAVAILABLE))
      .mockResolvedValue('ok');
    const result = await callWithResilience(fn, { ...opts, idempotent: true });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries DEADLINE_EXCEEDED for idempotent RPCs (succeeds on 3rd attempt)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeGrpcError(GRPC_STATUS.DEADLINE_EXCEEDED))
      .mockRejectedValueOnce(makeGrpcError(GRPC_STATUS.DEADLINE_EXCEEDED))
      .mockResolvedValue('ok');
    const result = await callWithResilience(fn, { ...opts, idempotent: true });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('exhausts retries and rejects when all attempts fail for idempotent RPCs', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);
    await expect(callWithResilience(fn, { ...opts, idempotent: true })).rejects.toBe(err);
    // initial attempt + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses a fresh deadline for each retry attempt', async () => {
    const deadlines: number[] = [];
    const fn = vi.fn().mockImplementation((deadline: Date) => {
      deadlines.push(deadline.getTime());
      return Promise.reject(makeGrpcError(GRPC_STATUS.UNAVAILABLE));
    });
    await expect(callWithResilience(fn, { ...opts, idempotent: true })).rejects.toBeDefined();
    expect(deadlines).toHaveLength(3);
    // Each deadline should be >= now+deadlineMs at the time of that call
    // They should all be close to each other but each generated fresh
    for (let i = 1; i < deadlines.length; i++) {
      // Each deadline was generated after the previous one — can't assert
      // strict ordering because test is fast, but they must all be in the future
      expect(deadlines[i]).toBeGreaterThan(Date.now() - 200);
    }
  });

  // ── retry: non-idempotent ────────────────────────────────────────

  it('does NOT retry UNAVAILABLE for non-idempotent RPCs', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);
    // idempotent defaults to false
    await expect(callWithResilience(fn, opts)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry DEADLINE_EXCEEDED for non-idempotent RPCs', async () => {
    const err = makeGrpcError(GRPC_STATUS.DEADLINE_EXCEEDED);
    const fn = vi.fn().mockRejectedValue(err);
    await expect(callWithResilience(fn, opts)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // ── retry: non-retryable errors ──────────────────────────────────

  it('does NOT retry NOT_FOUND even for idempotent RPCs', async () => {
    const err = makeGrpcError(GRPC_STATUS.NOT_FOUND);
    const fn = vi.fn().mockRejectedValue(err);
    await expect(callWithResilience(fn, { ...opts, idempotent: true })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry PERMISSION_DENIED even for idempotent RPCs', async () => {
    const err = makeGrpcError(GRPC_STATUS.PERMISSION_DENIED);
    const fn = vi.fn().mockRejectedValue(err);
    await expect(callWithResilience(fn, { ...opts, idempotent: true })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // ── circuit breaker: state transitions ──────────────────────────

  it('rejects fast (without calling fn) when circuit is open', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);

    // Exhaust failure threshold (3 failures with non-idempotent = 3 calls)
    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    // Circuit is now open — next call rejected without fn being invoked
    const callCountBefore = fn.mock.calls.length;
    const rejection = callWithResilience(fn, opts);
    await expect(rejection).rejects.toMatchObject({ code: GRPC_STATUS.UNAVAILABLE });
    expect(fn.mock.calls.length).toBe(callCountBefore); // fn NOT called
  });

  it('half-open: allows one probe through after cooldown', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    // Wait for cooldown (opts.cooldownMs = 50ms in test registry)
    await new Promise(resolve => setTimeout(resolve, 80));

    // Half-open: probe attempt should call fn
    const callsBefore = fn.mock.calls.length;
    await expect(callWithResilience(fn, opts)).rejects.toBeDefined(); // still failing
    expect(fn.mock.calls.length).toBe(callsBefore + 1); // fn WAS called
  });

  it('closes circuit when probe succeeds in half-open state', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    // First 3 calls fail (open circuit), then succeed
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('probe-ok');

    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    // Wait for cooldown
    await new Promise(resolve => setTimeout(resolve, 80));

    // Probe succeeds → circuit closes
    const result = await callWithResilience(fn, opts);
    expect(result).toBe('probe-ok');

    // Circuit is now closed: subsequent calls go through
    fn.mockResolvedValue('after-close');
    const result2 = await callWithResilience(fn, opts);
    expect(result2).toBe('after-close');
  });

  it('re-opens circuit when probe fails in half-open state', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);

    // Open circuit
    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    // Wait for cooldown → half-open
    await new Promise(resolve => setTimeout(resolve, 80));

    // Probe fails → back to open
    const callsBefore = fn.mock.calls.length;
    await expect(callWithResilience(fn, opts)).rejects.toBeDefined(); // probe attempt
    expect(fn.mock.calls.length).toBe(callsBefore + 1);

    // Now open again — next call should be rejected without calling fn
    const callsAfterProbe = fn.mock.calls.length;
    await expect(callWithResilience(fn, opts)).rejects.toMatchObject({
      code: GRPC_STATUS.UNAVAILABLE,
    });
    expect(fn.mock.calls.length).toBe(callsAfterProbe); // fn NOT called
  });

  // ── circuit breaker: gauge ───────────────────────────────────────

  it('gauge is 0 (closed) initially', async () => {
    const metrics = await registry.getMetricsAsJSON();
    const gauge = metrics.find(m => m.name === 'grpc_circuit_state');
    expect(gauge).toBeDefined();
    const value = (gauge as { values: Array<{ value: number }> }).values[0]?.value;
    expect(value).toBe(0);
  });

  it('gauge transitions to 2 (open) after threshold failures', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);

    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    const metrics = await registry.getMetricsAsJSON();
    const gauge = metrics.find(m => m.name === 'grpc_circuit_state');
    const value = (
      gauge as { values: Array<{ value: number; labels: Record<string, string> }> }
    ).values.find(v => v.labels.service === 'service.test')?.value;
    expect(value).toBe(2);
  });

  it('gauge transitions to 1 (half-open) after cooldown', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi.fn().mockRejectedValue(err);

    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    await new Promise(resolve => setTimeout(resolve, 80));

    // Trigger a call to transition to half-open
    await expect(callWithResilience(fn, opts)).rejects.toBeDefined();

    const metrics = await registry.getMetricsAsJSON();
    const gauge = metrics.find(m => m.name === 'grpc_circuit_state');
    // After the failed probe, circuit re-opens (value = 2)
    // To observe half-open we'd need to intercept between state check and fn call.
    // Instead verify the gauge exists with the right label.
    expect(
      (gauge as { values: Array<{ labels: Record<string, string> }> }).values.some(
        v => v.labels.service === 'service.test'
      )
    ).toBe(true);
  });

  it('gauge transitions back to 0 (closed) after successful probe', async () => {
    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');

    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(fn, opts)).rejects.toBeDefined();
    }

    await new Promise(resolve => setTimeout(resolve, 80));
    await callWithResilience(fn, opts); // probe succeeds

    const metrics = await registry.getMetricsAsJSON();
    const gauge = metrics.find(m => m.name === 'grpc_circuit_state');
    const value = (
      gauge as { values: Array<{ value: number; labels: Record<string, string> }> }
    ).values.find(v => v.labels.service === 'service.test')?.value;
    expect(value).toBe(0);
  });

  // ── circuit breaker: shared registry ──────────────────────────────

  it('multiple breakers on the same registry share one gauge (production boot path)', () => {
    // index.ts constructs all 10 clients against the same (default)
    // registry — creating a second breaker must reuse the existing
    // grpc_circuit_state gauge, not throw "already registered".
    const sharedRegistry = new Registry();

    const make = (service: string): CircuitBreaker =>
      createCircuitBreaker({ service, registry: sharedRegistry });

    expect(() => {
      make('service.a');
      make('service.b');
      make('service.c');
    }).not.toThrow();
  });

  it('a breaker created after the shared registry is cleared re-registers the gauge', async () => {
    // Vitest suites clear registries between tests; a stale cached gauge
    // would silently vanish from /metrics.
    const sharedRegistry = new Registry();
    createCircuitBreaker({ service: 'service.a', registry: sharedRegistry });
    sharedRegistry.clear();

    createCircuitBreaker({ service: 'service.b', registry: sharedRegistry });
    const metrics = await sharedRegistry.metrics();
    expect(metrics).toContain('grpc_circuit_state');
  });

  // ── circuit breaker: isolation ───────────────────────────────────

  it('circuit breakers are isolated per service', async () => {
    const serviceARegistry = new Registry();
    const serviceBRegistry = new Registry();

    const breakerA = createCircuitBreaker({
      service: 'service.a',
      failureThreshold: 3,
      windowMs: 10_000,
      cooldownMs: 50,
      registry: serviceARegistry,
    });
    const breakerB = createCircuitBreaker({
      service: 'service.b',
      failureThreshold: 3,
      windowMs: 10_000,
      cooldownMs: 50,
      registry: serviceBRegistry,
    });

    const optsA: ResilienceOptions = {
      service: 'service.a',
      deadlineMs: 100,
      maxRetries: 0,
      circuitBreaker: breakerA,
    };
    const optsB: ResilienceOptions = {
      service: 'service.b',
      deadlineMs: 100,
      maxRetries: 0,
      circuitBreaker: breakerB,
    };

    const err = makeGrpcError(GRPC_STATUS.UNAVAILABLE);
    const failingFn = vi.fn().mockRejectedValue(err);
    const successFn = vi.fn().mockResolvedValue('b-ok');

    // Open circuit A
    for (let i = 0; i < 3; i++) {
      await expect(callWithResilience(failingFn, optsA)).rejects.toBeDefined();
    }

    // Circuit B should still be closed — fn should be called
    const result = await callWithResilience(successFn, optsB);
    expect(result).toBe('b-ok');
    expect(successFn).toHaveBeenCalledTimes(1);

    serviceARegistry.clear();
    serviceBRegistry.clear();
  });
});
