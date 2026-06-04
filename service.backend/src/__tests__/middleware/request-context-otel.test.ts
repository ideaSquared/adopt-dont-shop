/**
 * ADS-660: when an OTel span is active for a request, the
 * request-context middleware MUST derive the W3C traceparent from
 * that span (not from the inbound header, not minted). This
 * guarantees Winston log lines and the SDK's exporter agree on
 * trace_id, so a single trace stitches logs + spans in the collector.
 *
 * We exercise the middleware inside a manually-created OTel span so
 * the test doesn't depend on the full SDK being started — the
 * BasicTracerProvider with an AsyncLocalStorageContextManager is
 * enough to make `trace.getActiveSpan()` return our span.
 */
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';

import { requestContextMiddleware } from '../../middleware/request-context';
import { getTraceparent } from '../../utils/request-context';

// Register a minimal tracer provider + context manager once for the
// test process. This is the same shape the real NodeSDK installs,
// just without the OTLP exporter.
const contextManager = new AsyncLocalStorageContextManager();
contextManager.enable();
context.setGlobalContextManager(contextManager);

const provider = new BasicTracerProvider();
trace.setGlobalTracerProvider(provider);

const tracer = trace.getTracer('ads-660-test');

describe('requestContextMiddleware × OpenTelemetry (ADS-660)', () => {
  const buildApp = () => {
    const app = express();
    app.use(requestContextMiddleware);
    app.get('/probe', (_req, res) => {
      res.json({ traceparent: getTraceparent() });
    });
    return app;
  };

  it('derives the traceparent from the active OTel span when one exists', async () => {
    const app = buildApp();
    const span = tracer.startSpan('test-root');
    const ctx = trace.setSpan(context.active(), span);

    const response = await context.with(ctx, () => request(app).get('/probe'));
    span.end();

    const spanContext = span.spanContext();
    const expectedPrefix = `00-${spanContext.traceId}-`;
    expect(response.body.traceparent).toMatch(new RegExp(`^${expectedPrefix}`));
    // The echoed header must agree with the in-process traceparent so
    // downstream callers see the same trace ID.
    expect(response.headers.traceparent).toBe(response.body.traceparent);
  });

  it('falls back to the inbound header when no OTel span is active', async () => {
    const app = buildApp();
    const inbound = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const response = await request(app).get('/probe').set('traceparent', inbound);
    expect(response.body.traceparent).toBe(inbound);
  });
});
