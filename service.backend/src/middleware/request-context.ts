import { NextFunction, Request, Response } from 'express';
import { randomBytes, randomUUID } from 'crypto';
import { trace } from '@opentelemetry/api';
import {
  isValidTraceparent,
  mintTraceparent,
  runWithContext,
  setCorrelationId,
  setTraceparent,
} from '../utils/request-context';

/**
 * Establish a fresh AsyncLocalStorage context for the lifetime of one
 * request. Mounted before auth so the auth middleware can fill in userId
 * later. Without this, getUserId() in model hooks always returns undefined.
 *
 * ADS-405: also generates a correlation ID for every request that arrives
 * without one and propagates it via AsyncLocalStorage so Winston log calls
 * automatically stamp the ID without threading it through every signature.
 * The ID is also echoed back as `X-Correlation-ID` so callers (and load
 * balancer logs) can correlate too.
 */
const CORRELATION_HEADER = 'x-correlation-id';
const REQUEST_ID_HEADER = 'x-request-id';
const TRACEPARENT_HEADER = 'traceparent';

const randomHex = (bytes: number): string => randomBytes(bytes).toString('hex');

/**
 * ADS-660: resolve the traceparent to thread through AsyncLocalStorage.
 * The OTel SDK (when started) creates a server span before this
 * middleware runs because `@opentelemetry/instrumentation-http` hooks
 * `http.createServer`. Reading the active span gives us the exact
 * trace/span IDs the exporter will ship, so logs match traces 1:1.
 *
 * When the SDK is not started (no OTEL_EXPORTER_OTLP_ENDPOINT), the
 * `trace.getActiveSpan()` call returns undefined and we fall back to
 * the existing scaffold (inbound header → mint fresh) so local dev /
 * tests keep working unchanged.
 */
const resolveTraceparent = (req: Request): string => {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    const ctx = activeSpan.spanContext();
    // `isValidSpanContext` semantics: trace ID and span ID both non-zero.
    if (ctx.traceId && ctx.spanId && ctx.traceId !== '0'.repeat(32)) {
      const flags = (ctx.traceFlags & 0xff).toString(16).padStart(2, '0');
      return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
    }
  }
  const inbound = (req.get(TRACEPARENT_HEADER) ?? '').trim();
  if (inbound && isValidTraceparent(inbound)) {
    return inbound;
  }
  return mintTraceparent(randomHex);
};

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  runWithContext({}, () => {
    const incoming =
      (req.get(CORRELATION_HEADER) ?? req.get(REQUEST_ID_HEADER) ?? '').trim() || undefined;
    const correlationId = incoming ?? randomUUID();
    setCorrelationId(correlationId);
    res.setHeader('X-Correlation-ID', correlationId);

    // ADS-660: thread W3C trace context so downstream calls and collectors
    // can stitch end-to-end traces. Resolution order:
    //   1. If the OTel SDK is started and the HTTP auto-instrumentation
    //      has already created a server span for this request, derive
    //      the traceparent from that span — guarantees logs, outbound
    //      calls, and the SDK exporter share the same trace ID.
    //   2. Otherwise accept the inbound header if it passes the strict
    //      regex.
    //   3. Otherwise mint a fresh one (scaffold path from #824 stays
    //      working when the SDK is no-op).
    const traceparent = resolveTraceparent(req);
    setTraceparent(traceparent);
    res.setHeader('traceparent', traceparent);
    next();
  });
};
