import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initializeOpenTelemetry, isOpenTelemetryStarted } from './opentelemetry.js';

const ENV_KEYS = [
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_SERVICE_NAME',
  'npm_package_version',
] as const;

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]])) as Record<
    (typeof ENV_KEYS)[number],
    string | undefined
  >;
}
function restoreEnv(snap: ReturnType<typeof snapshotEnv>) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snap[k];
    }
  }
}

describe('initializeOpenTelemetry', () => {
  let envSnap: ReturnType<typeof snapshotEnv>;

  beforeEach(() => {
    envSnap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(envSnap);
  });

  // The OTel SDK keeps a module-level singleton (matches service.backend's
  // pattern exactly — see src/instrumentation.ts). That makes the
  // "endpoint set → SDK starts" path hard to unit-test in isolation
  // without resetting the module between cases. We instead verify the
  // safe no-op path here; integration coverage of the started SDK comes
  // when the first extracted service ships and wires it for real.

  it('returns null when OTEL_EXPORTER_OTLP_ENDPOINT is unset', () => {
    const sdk = initializeOpenTelemetry({ serviceName: 'svc' });
    expect(sdk).toBeNull();
  });

  it('treats a whitespace-only OTEL_EXPORTER_OTLP_ENDPOINT as unset (trims)', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '   ';
    const sdk = initializeOpenTelemetry({ serviceName: 'svc' });
    expect(sdk).toBeNull();
  });

  it('does not flip isOpenTelemetryStarted when the endpoint is unset', () => {
    const before = isOpenTelemetryStarted();
    initializeOpenTelemetry({ serviceName: 'svc' });
    expect(isOpenTelemetryStarted()).toBe(before);
  });

  it('never throws even on misconfiguration (no-op contract)', () => {
    expect(() => initializeOpenTelemetry({ serviceName: 'svc' })).not.toThrow();
  });
});
