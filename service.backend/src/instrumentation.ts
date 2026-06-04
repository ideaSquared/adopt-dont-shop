/**
 * ADS-660: OpenTelemetry SDK bootstrap.
 *
 * MUST be loaded before any other application module so the auto-
 * instrumentations can hook into `http`, `express`, `pg`, `ioredis`,
 * etc. before those modules are first imported. We achieve that by
 * running this file via Node's `--import` flag (set in package.json
 * scripts). Importing it from inside `src/index.ts` is too late.
 *
 * Behaviour:
 *   - If `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, the SDK is NOT started.
 *     The application boots normally and the existing W3C traceparent
 *     scaffold (request-context.ts) keeps stamping correlation IDs.
 *   - If the endpoint IS set, NodeSDK starts with the OTLP/HTTP exporter
 *     and the auto-instrumentation bundle. Other knobs
 *     (`OTEL_SERVICE_NAME`, `OTEL_TRACES_SAMPLER`,
 *     `OTEL_TRACES_SAMPLER_ARG`) are read directly by the SDK.
 *   - Service version is sourced from the backend's package.json via
 *     the `npm_package_version` env var that npm injects at script
 *     time, so a deployed build reports the right tag.
 *
 * No-op contract: this module must never throw — a misconfigured
 * exporter should degrade to "no traces" rather than wedge boot.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const DEFAULT_SERVICE_NAME = 'adopt-dont-shop-backend';

const resolveServiceVersion = (): string => {
  // Avoid a static `require('../package.json')` — that would force tsc
  // to copy the JSON into dist or trip resolveJsonModule. The npm CLI
  // injects the version into the env when running an npm script.
  return process.env.npm_package_version ?? '1.0.0';
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

export const initializeOpenTelemetry = (): NodeSDK | null => {
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
    const serviceName = process.env.OTEL_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME;

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: resolveServiceVersion(),
      }),
      traceExporter: new OTLPTraceExporter({
        // Endpoint may be a collector root (`http://collector:4318`)
        // or include `/v1/traces` already — the exporter handles both.
        url: endpoint,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // `instrumentation-fs` emits a span per readFile / stat,
          // multiplying trace volume by ~100x with no operational
          // value. Operators can override via the standard
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
    // No logger available here (loading order). Stderr is the right
    // sink for boot-path issues.

    console.error('OpenTelemetry SDK failed to start; continuing without traces.');
    return null;
  }
};

// Auto-run on import so `node --import ./src/instrumentation.ts ...`
// activates the SDK before any other module loads.
initializeOpenTelemetry();
