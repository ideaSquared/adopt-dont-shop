// OpenTelemetry SDK bootstrap — direct port of service.backend's
// src/instrumentation.ts (ADS-660) with the service name parameterised so
// every extracted service can use the same code by passing its own name.
//
// MUST be invoked by an entry-point file that's loaded via Node's
// `--import` flag — the auto-instrumentations need to hook `http`,
// `express`, `pg`, `ioredis` etc. BEFORE those modules are first imported.
// Each service has its own `src/instrumentation.ts` shim that calls
// `initializeOpenTelemetry({ serviceName: '<service>' })` and IS the
// --import target.
//
// Behaviour mirrors service.backend exactly:
//   - If OTEL_EXPORTER_OTLP_ENDPOINT is unset, the SDK is NOT started.
//     The service boots normally; correlation IDs continue via the
//     caller's own request-context scaffold.
//   - If set, NodeSDK starts with the OTLP/HTTP exporter + the auto
//     bundle (instrumentation-fs disabled — too noisy).
//   - OTEL_SERVICE_NAME env var overrides the option. Service version
//     resolves from `npm_package_version` injected by npm at script time.
//   - No-op contract: this module must never throw.

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export type OpenTelemetryOptions = {
  // The default `service.name` resource attribute. OTEL_SERVICE_NAME env
  // var still wins if set — operators override per-deploy without code
  // changes.
  serviceName: string;
  // Optional version. Falls back to `npm_package_version` (npm injects
  // this at script time), then to '1.0.0'.
  serviceVersion?: string;
};

type InstrumentationState = {
  started: boolean;
  sdk: NodeSDK | null;
};

const state: InstrumentationState = {
  started: false,
  sdk: null,
};

export const isOpenTelemetryStarted = (): boolean => state.started;

const resolveServiceVersion = (override?: string): string => {
  return override ?? process.env.npm_package_version ?? '1.0.0';
};

export const initializeOpenTelemetry = (opts: OpenTelemetryOptions): NodeSDK | null => {
  if (state.started) {
    return state.sdk;
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) {
    // No collector configured — silently no-op so local dev / tests
    // boot without an OTLP endpoint. No logger is available yet.
    return null;
  }

  try {
    const serviceName = process.env.OTEL_SERVICE_NAME?.trim() || opts.serviceName;

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: resolveServiceVersion(opts.serviceVersion),
      }),
      traceExporter: new OTLPTraceExporter({
        // Endpoint may be a collector root (`http://collector:4318`) or
        // include `/v1/traces` already — the exporter handles both.
        url: endpoint,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // instrumentation-fs emits a span per readFile / stat,
          // multiplying trace volume by ~100x with no operational value.
          // Operators can override via the standard
          // OTEL_NODE_DISABLED_INSTRUMENTATIONS / ENABLED env vars.
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();
    state.started = true;
    state.sdk = sdk;

    const shutdown = async (): Promise<void> => {
      try {
        await sdk.shutdown();
      } catch {
        // Swallow — shutdown runs during termination; a hung exporter
        // must not block the rest of the drain.
      }
    };

    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    return sdk;
  } catch {
    // No logger is reliably available at this stage of the boot path —
    // stderr is the right sink for the misconfigured-exporter case.
    console.error('OpenTelemetry SDK failed to start; continuing without traces.');
    return null;
  }
};
