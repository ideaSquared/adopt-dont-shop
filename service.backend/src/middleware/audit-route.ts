import { NextFunction, Request, Response } from 'express';
import { AuditLogService } from '../services/auditLog.service';
import type { AuthenticatedRequest } from '../types/auth';
import type { JsonObject, JsonValue } from '../types/common';
import { logger, loggerHelpers } from '../utils/logger';
import { getCorrelationId } from '../utils/request-context';

/**
 * Declarative route-level audit middleware (Layer 2 — audit events).
 *
 * Mirrors the post-response pattern from `httpAccessLog` (morgan.ts:14): the
 * middleware registers `res.on('finish')` and the audit row is written AFTER
 * the response is sent, so it never delays the user-visible request.
 *
 * Trade-off: because the audit write runs after `res.finish`, it cannot share
 * a Sequelize transaction with the route handler. Use this for "I observed
 * this happened" audit on CRUD routes that do NOT need transactional pairing.
 * When the audit MUST commit atomically with the business write, call
 * `AuditLogService.log({..., transaction: t})` explicitly inside the service
 * instead.
 *
 * The middleware only writes an audit row when the response status is 2xx;
 * 4xx/5xx are intentionally skipped because the business action did not
 * succeed.
 */

export type AuditDescriptor = {
  /** Action name written to audit_logs (e.g. 'STAFF_INVITED'). */
  action: string;
  /** Entity type written to audit_logs (e.g. 'Invitation', 'Pet'). */
  entity: string;
  /**
   * Where to read the affected entity's primary key. Default sources are
   * checked in order: params, body, response body (captured by patching
   * `res.json`). Custom resolver wins when supplied.
   */
  entityIdFrom?: string | ((ctx: AuditResolverContext) => string | undefined);
  /**
   * Optional extra metadata to capture. Each entry is a dotted path resolved
   * against `{ params, body, query, response }`. Resolved values are placed
   * into the audit row's `details` object keyed by the leaf segment.
   */
  metadataFrom?: ReadonlyArray<string>;
  /**
   * If true, also emit an audit row when the response status is 4xx (e.g.
   * forbidden / validation failure) with status='failure'. Defaults to false.
   */
  auditFailures?: boolean;
};

export type AuditResolverContext = {
  params: Record<string, unknown>;
  body: unknown;
  query: Record<string, unknown>;
  response: unknown;
};

const readPath = (root: unknown, path: string): unknown => {
  if (!root || typeof root !== 'object') {
    return undefined;
  }
  const segments = path.split('.');
  let cursor: unknown = root;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    if (typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

const resolveEntityId = (
  descriptor: AuditDescriptor,
  ctx: AuditResolverContext
): string | undefined => {
  const { entityIdFrom } = descriptor;
  if (typeof entityIdFrom === 'function') {
    const value = entityIdFrom(ctx);
    return typeof value === 'string' ? value : undefined;
  }
  if (typeof entityIdFrom === 'string') {
    const value = readPath(ctx, entityIdFrom);
    return typeof value === 'string' ? value : value !== undefined ? String(value) : undefined;
  }
  // Default precedence: params.<entity>Id, params.id, response.<entity>Id, response.id
  const lower = descriptor.entity.charAt(0).toLowerCase() + descriptor.entity.slice(1);
  const candidates = [
    ctx.params?.[`${lower}Id`],
    ctx.params?.id,
    readPath(ctx.response, `${lower}.id`),
    readPath(ctx.response, `${lower}Id`),
    readPath(ctx.response, 'id'),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
    if (typeof candidate === 'number') {
      return String(candidate);
    }
  }
  return undefined;
};

const collectMetadata = (
  descriptor: AuditDescriptor,
  ctx: AuditResolverContext
): JsonObject | undefined => {
  if (!descriptor.metadataFrom || descriptor.metadataFrom.length === 0) {
    return undefined;
  }
  const out: Record<string, JsonValue> = {};
  for (const path of descriptor.metadataFrom) {
    const value = readPath(ctx, path);
    if (value === undefined) {
      continue;
    }
    const key = path.split('.').pop() ?? path;
    // Drop non-JSON values silently; logger.ts will redact secret-shaped fields.
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      out[key] = value as JsonValue;
    } else if (typeof value === 'object') {
      try {
        out[key] = JSON.parse(JSON.stringify(value)) as JsonValue;
      } catch {
        // ignore non-serialisable values
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

export const auditRoute =
  (descriptor: AuditDescriptor) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // Capture the response body so resolvers can read newly-created IDs.
    // We intentionally don't capture large response bodies — only enough to
    // resolve descriptor paths. The cached body is stored as a closure
    // variable and never logged in full.
    let capturedBody: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      capturedBody = body;
      return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
      const status = res.statusCode;
      const succeeded = status >= 200 && status < 300;
      const isClientError = status >= 400 && status < 500;
      if (!succeeded && !(descriptor.auditFailures && isClientError)) {
        return;
      }

      const ctx: AuditResolverContext = {
        params: (req.params ?? {}) as Record<string, unknown>,
        body: req.body,
        query: (req.query ?? {}) as Record<string, unknown>,
        response: capturedBody,
      };

      const authedReq = req as AuthenticatedRequest;
      const userId = authedReq.user?.userId;
      const entityId = resolveEntityId(descriptor, ctx);
      const metadata = collectMetadata(descriptor, ctx);
      const correlationId = getCorrelationId();
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('User-Agent') || undefined;

      // ADS-754: on a successful response, an unresolved entityId means the
      // descriptor's resolver (or the default precedence) couldn't find the
      // PK in params / body / response. Writing an empty-string entityId
      // produces forensically useless rows that all collide on the same
      // unindexable key, so skip the write and surface a warning instead.
      // Failure audits (auditFailures: true) are still written because the
      // entityId may legitimately be absent for those.
      if (succeeded && entityId === undefined) {
        logger.warn(
          'audit-route: skipping audit row — entityId could not be resolved on success response',
          {
            action: descriptor.action,
            entity: descriptor.entity,
            method: req.method,
            path: req.originalUrl || req.url,
            correlationId,
          }
        );
        return;
      }

      // Layer 1 mirror: emit a tagged log line so the event shows up in Loki
      // alongside operational logs, keyed by correlationId.
      loggerHelpers.logAudit(descriptor.action, {
        entity: descriptor.entity,
        entityId,
        userId,
        status: succeeded ? 'success' : 'failure',
        statusCode: status,
        method: req.method,
        path: req.originalUrl || req.url,
        correlationId,
        ip: ipAddress,
        ...(metadata ? { details: metadata } : {}),
      });

      // Layer 2 write: persist the immutable audit row. Fire-and-forget; a
      // failure here is logged but does not crash the request (the response
      // is already on the wire). Transactional contracts belong in services.
      void AuditLogService.log({
        userId: userId ?? '',
        action: descriptor.action,
        entity: descriptor.entity,
        entityId: entityId ?? '',
        details: metadata,
        ipAddress,
        userAgent,
        level: succeeded ? 'INFO' : 'WARNING',
        status: succeeded ? 'success' : 'failure',
      }).catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('audit-route: failed to write audit_logs row', {
          action: descriptor.action,
          entity: descriptor.entity,
          entityId,
          error: message,
          correlationId,
        });
      });
    });

    next();
  };
