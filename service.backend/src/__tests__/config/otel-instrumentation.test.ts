/**
 * ADS-660: OpenTelemetry SDK bootstrap behaviour.
 *
 * The SDK must:
 *   - No-op cleanly when OTEL_EXPORTER_OTLP_ENDPOINT is unset (local
 *     dev / tests must not require a collector).
 *   - Not throw at import even with a malformed endpoint (boot path
 *     must survive misconfiguration).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initializeOpenTelemetry, isOpenTelemetryStarted } from '../../instrumentation';

describe('OpenTelemetry SDK bootstrap (ADS-660)', () => {
  const originalEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  beforeEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  afterEach(() => {
    if (originalEndpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEndpoint;
    }
  });

  it('no-ops when OTEL_EXPORTER_OTLP_ENDPOINT is unset', () => {
    expect(() => initializeOpenTelemetry()).not.toThrow();
    // Module-level auto-init already ran at import time without an
    // endpoint configured, so the SDK should not be started.
    expect(isOpenTelemetryStarted()).toBe(false);
    expect(initializeOpenTelemetry()).toBeNull();
  });

  it('returns the same SDK instance on repeated initialise calls', () => {
    const first = initializeOpenTelemetry();
    const second = initializeOpenTelemetry();
    // Both calls return the same value — either both null (no
    // endpoint) or both the singleton SDK.
    expect(second).toBe(first);
  });
});
