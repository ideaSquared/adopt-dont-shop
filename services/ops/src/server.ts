import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';
import { z } from 'zod';

import { createMicroserviceServer, type ReadinessDeps } from '@adopt-dont-shop/service-bootstrap';
import {
  CreateUnlockRequestSchema,
  HistoryResponseSchema,
  InvokeRequestSchema,
  InvokeResponseSchema,
  LocalLoginRequestSchema,
  LoginPollRequestSchema,
  WhoamiResponseSchema,
} from '@adopt-dont-shop/ops-contract';
import type { ProtoSchema } from '@adopt-dont-shop/proto';

import type { AuthContext, AuthService } from './auth.js';
import { buildCatalog } from './catalog.js';
import type { OpsConfig } from './config.js';
import { httpStatusFor, OpsError, toErrorResponse } from './errors.js';
import type { InvokeService } from './invoke.js';
import type { OpsStore } from './store.js';
import type { UnlocksService } from './unlocks.js';

export type OpsServerDeps = {
  config: Pick<OpsConfig, 'env' | 'nodeEnv' | 'authMode'>;
  logger: Logger;
  auth: AuthService;
  invoke: InvokeService;
  unlocks: UnlocksService;
  store: OpsStore;
  schema: ProtoSchema;
  now: () => Date;
  isReady?: () => boolean;
  readiness?: ReadinessDeps;
};

const DEFAULT_HISTORY = 20;
const MAX_HISTORY = 100;

const sendError = (reply: FastifyReply, err: OpsError): FastifyReply =>
  reply.status(httpStatusFor(err.code)).send(toErrorResponse(err));

const invalid = (message: string): OpsError =>
  new OpsError('INVALID_ARGUMENT', message, 'Check the request against the ops contract.');

const bearerOf = (req: FastifyRequest): string | undefined => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
};

export const createServer = (deps: OpsServerDeps): FastifyInstance => {
  const server = createMicroserviceServer({
    serviceName: 'service.ops',
    config: { environment: deps.config.nodeEnv },
    logger: deps.logger,
    isReady: deps.isReady,
    readiness: deps.readiness,
  });

  server.setNotFoundHandler((_req, reply) =>
    sendError(reply, new OpsError('NOT_FOUND', 'No such route', 'Routes live under /v1.'))
  );

  server.register(async api => {
    // Every error on the HTTP surface is an ErrorResponse, including framework
    // errors (malformed JSON, unknown routes).
    api.setErrorHandler((err, _req, reply) => {
      if (err instanceof OpsError) {
        return sendError(reply, err);
      }
      const statusCode =
        typeof err === 'object' && err !== null ? Reflect.get(err, 'statusCode') : undefined;
      if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
        return sendError(reply, invalid('The request could not be parsed'));
      }
      deps.logger.error('unhandled error', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      return sendError(
        reply,
        new OpsError('INTERNAL', 'Unexpected failure', 'Check the service.ops logs.')
      );
    });
    const parseBody = <T>(
      schema: {
        safeParse: (
          v: unknown
        ) =>
          | { success: true; data: T }
          | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
      },
      body: unknown
    ): T => {
      const parsed = schema.safeParse(body ?? {});
      if (parsed.success) {
        return parsed.data;
      }
      const issue = parsed.error.issues[0];
      throw invalid(`${issue.path.join('.') || 'body'}: ${issue.message}`);
    };

    // ---- unauthenticated ----------------------------------------------------

    api.post('/v1/login/start', async () => deps.auth.startLogin());
    api.post('/v1/login/poll', async req =>
      deps.auth.pollLogin(parseBody(LoginPollRequestSchema, req.body).deviceCode)
    );
    if (deps.config.authMode === 'local') {
      api.post('/v1/login/local', async req =>
        deps.auth.localLogin(parseBody(LocalLoginRequestSchema, req.body).login)
      );
    }

    // ---- authenticated ------------------------------------------------------

    const contexts = new WeakMap<FastifyRequest, AuthContext>();
    const ctxOf = (req: FastifyRequest): AuthContext => {
      const ctx = contexts.get(req);
      if (ctx === undefined) {
        throw new OpsError('UNAUTHENTICATED', 'Not logged in', 'Run `pnpm ops login`.');
      }
      return ctx;
    };

    api.register(async scope => {
      scope.addHook('preHandler', async req => {
        const token = bearerOf(req);
        const ctx = token === undefined ? null : await deps.auth.authenticate(token);
        if (ctx === null) {
          throw new OpsError(
            'UNAUTHENTICATED',
            'Missing, expired or revoked session',
            'Run `pnpm ops login`.'
          );
        }
        contexts.set(req, ctx);
      });

      scope.post('/v1/logout', async (req, reply) => {
        await deps.auth.logout(ctxOf(req).sessionId);
        return reply.status(204).send();
      });

      scope.get('/v1/whoami', async req => {
        const ctx = ctxOf(req);
        return WhoamiResponseSchema.parse({
          env: deps.config.env,
          operator: ctx.operator,
          sessionExpiresAt: ctx.sessionExpiresAt.toISOString(),
          unlocks: await deps.unlocks.list(ctx),
        });
      });

      scope.get('/v1/catalog', async () => buildCatalog(deps.config.env, deps.schema));

      scope.get('/v1/history', async req => {
        const raw = Number(
          z.object({ limit: z.string().optional() }).parse(req.query).limit ?? DEFAULT_HISTORY
        );
        const limit =
          Number.isInteger(raw) && raw > 0 ? Math.min(raw, MAX_HISTORY) : DEFAULT_HISTORY;
        const entries = await deps.store.listHistory(ctxOf(req).operator.operatorId, limit);
        return HistoryResponseSchema.parse({ entries });
      });

      scope.post('/v1/invoke', async req => {
        const body = parseBody(InvokeRequestSchema, req.body);
        const requestId = String(req.headers['x-request-id'] ?? randomUUID());
        return InvokeResponseSchema.parse(await deps.invoke.invoke(ctxOf(req), body, requestId));
      });

      scope.post('/v1/unlocks', async (req, reply) => {
        const unlock = await deps.unlocks.create(
          ctxOf(req),
          parseBody(CreateUnlockRequestSchema, req.body)
        );
        return reply.status(201).send({ unlock });
      });
      scope.get('/v1/unlocks', async req => ({ unlocks: await deps.unlocks.list(ctxOf(req)) }));
      scope.delete('/v1/unlocks', async (req, reply) => {
        await deps.unlocks.revokeAll(ctxOf(req));
        return reply.status(204).send();
      });
      scope.delete('/v1/unlocks/:unlockId', async (req, reply) => {
        await deps.unlocks.revoke(
          ctxOf(req),
          z.object({ unlockId: z.string() }).parse(req.params).unlockId
        );
        return reply.status(204).send();
      });
    });
  });

  return server;
};
