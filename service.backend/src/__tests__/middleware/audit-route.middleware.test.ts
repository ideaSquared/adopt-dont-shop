import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { auditRoute } from '../../middleware/audit-route';
import { AuditLogService } from '../../services/auditLog.service';
import { logger, loggerHelpers } from '../../utils/logger';
import { requestContextMiddleware } from '../../middleware/request-context';

describe('auditRoute middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use(requestContextMiddleware);
    return app;
  };

  it('writes audit_logs row and emits log line on 2xx response', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);
    const logSpy = vi.spyOn(loggerHelpers, 'logAudit');

    const app = buildApp();
    app.post(
      '/widgets',
      auditRoute({ action: 'WIDGET_CREATED', entity: 'Widget' }),
      (_req, res) => {
        res.status(201).json({ widget: { id: 'w-123' } });
      }
    );

    const res = await request(app).post('/widgets').send({ color: 'red' });
    expect(res.status).toBe(201);

    // res.on('finish') is async — give the microtask queue a tick.
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const [audit] = dbSpy.mock.calls[0];
    expect(audit.action).toBe('WIDGET_CREATED');
    expect(audit.entity).toBe('Widget');
    expect(audit.entityId).toBe('w-123');
    expect(audit.status).toBe('success');
  });

  it('does NOT write audit row on 4xx by default', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);
    const logSpy = vi.spyOn(loggerHelpers, 'logAudit');

    const app = buildApp();
    app.post(
      '/widgets',
      auditRoute({ action: 'WIDGET_CREATED', entity: 'Widget' }),
      (_req, res) => {
        res.status(400).json({ error: 'bad' });
      }
    );

    await request(app).post('/widgets');
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does NOT write audit row on 5xx', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);

    const app = buildApp();
    app.post(
      '/widgets',
      auditRoute({ action: 'WIDGET_CREATED', entity: 'Widget' }),
      (_req, res) => {
        res.status(500).json({ error: 'kaboom' });
      }
    );

    await request(app).post('/widgets');
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy).not.toHaveBeenCalled();
  });

  it('writes failure audit on 4xx when auditFailures: true', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);

    const app = buildApp();
    app.post(
      '/widgets',
      auditRoute({ action: 'WIDGET_CREATED', entity: 'Widget', auditFailures: true }),
      (_req, res) => {
        res.status(403).json({ error: 'forbidden' });
      }
    );

    await request(app).post('/widgets');
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(dbSpy.mock.calls[0][0].status).toBe('failure');
    expect(dbSpy.mock.calls[0][0].level).toBe('WARNING');
  });

  it('resolves entityId from params via default precedence', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);

    const app = buildApp();
    app.patch(
      '/widgets/:widgetId',
      auditRoute({ action: 'WIDGET_UPDATED', entity: 'Widget' }),
      (_req, res) => {
        res.json({ ok: true });
      }
    );

    await request(app).patch('/widgets/wid-9');
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy.mock.calls[0][0].entityId).toBe('wid-9');
  });

  it('honours explicit entityIdFrom resolver function', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);

    const app = buildApp();
    app.post(
      '/things',
      auditRoute({
        action: 'THING_CREATED',
        entity: 'Thing',
        entityIdFrom: ctx => {
          const res = ctx.response as { thing?: { customKey?: string } };
          return res.thing?.customKey;
        },
      }),
      (_req, res) => {
        res.json({ thing: { customKey: 'tk-42' } });
      }
    );

    await request(app).post('/things');
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy.mock.calls[0][0].entityId).toBe('tk-42');
  });

  it('collects metadata from declared paths', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);

    const app = buildApp();
    app.post(
      '/rescues/:rescueId/invites',
      auditRoute({
        action: 'STAFF_INVITED',
        entity: 'Invitation',
        metadataFrom: ['params.rescueId', 'body.email'],
      }),
      (_req, res) => {
        res.status(201).json({ id: 'inv-1' });
      }
    );

    await request(app).post('/rescues/r-7/invites').send({ email: 'new@x.test' });
    await new Promise(resolve => setImmediate(resolve));

    const details = dbSpy.mock.calls[0][0].details;
    expect(details).toEqual({ rescueId: 'r-7', email: 'new@x.test' });
  });

  it('skips audit row and warns when entityId cannot be resolved on a 2xx (ADS-754)', async () => {
    const dbSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);
    const logAuditSpy = vi.spyOn(loggerHelpers, 'logAudit');
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);

    const app = buildApp();
    app.post(
      '/widgets',
      // No entityIdFrom, and response shape doesn't match the default
      // precedence (no widget.id, no widgetId, no id).
      auditRoute({ action: 'WIDGET_CREATED', entity: 'Widget' }),
      (_req, res) => {
        res.status(201).json({ success: true, message: 'ok' });
      }
    );

    await request(app).post('/widgets').send({ color: 'red' });
    await new Promise(resolve => setImmediate(resolve));

    expect(dbSpy).not.toHaveBeenCalled();
    expect(logAuditSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('entityId could not be resolved'),
      expect.objectContaining({ action: 'WIDGET_CREATED', entity: 'Widget' })
    );
  });

  it('propagates correlationId from AsyncLocalStorage into the log line', async () => {
    vi.spyOn(AuditLogService, 'log').mockResolvedValue({} as never);
    const logSpy = vi.spyOn(loggerHelpers, 'logAudit');

    const app = buildApp();
    app.post('/things', auditRoute({ action: 'THING_DONE', entity: 'Thing' }), (_req, res) => {
      res.json({ id: 'x' });
    });

    await request(app).post('/things').set('X-Correlation-ID', 'corr-abc');
    await new Promise(resolve => setImmediate(resolve));

    expect(logSpy.mock.calls[0][1].correlationId).toBe('corr-abc');
  });
});
