// Test doubles for service.ops: an in-memory OpsStore, a scripted gRPC caller and
// fetch, and a harness that assembles the real server around them. Imported only
// by *.test.ts files.

import { randomUUID } from 'node:crypto';

import { Metadata } from '@grpc/grpc-js';
import winston from 'winston';

import type { DomainEvent } from '@adopt-dont-shop/events';
import { DRY_RUN_APPLIED_HEADER, DRY_RUN_HEADER } from '@adopt-dont-shop/service-bootstrap';
import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import { PROTO_SCHEMA } from '@adopt-dont-shop/proto';

import {
  chainEntry,
  GENESIS_HASH,
  type AccessLogEntry,
  type ChainedEntry,
} from './access-chain.js';
import { createAuthService } from './auth.js';
import { createGithubClient } from './github.js';
import { createInvokeService } from './invoke.js';
import { createMethodResolver, type GrpcCall, type GrpcResult } from './proto-methods.js';
import { createServer } from './server.js';
import type {
  HistoryRecord,
  OperatorRecord,
  OpsStore,
  PlanRecord,
  SessionRecord,
  UnlockRecord,
} from './store.js';
import { createUnlocksService } from './unlocks.js';

export const SILENT_LOGGER = winston.createLogger({ silent: true });

export type FakeStore = OpsStore & {
  events: DomainEvent[];
  accessLog: ChainedEntry[];
  plans: Map<string, PlanRecord>;
  unlocks: UnlockRecord[];
};

export const makeFakeStore = (): FakeStore => {
  const operators = new Map<string, OperatorRecord>();
  const sessions = new Map<string, SessionRecord & { tokenHash: string; revokedAt: Date | null }>();
  const plans = new Map<string, PlanRecord>();
  const unlocks: (UnlockRecord & { revokedAt: Date | null })[] = [];
  const events: DomainEvent[] = [];
  const accessLog: ChainedEntry[] = [];

  return {
    events,
    accessLog,
    plans,
    unlocks,
    async upsertOperator(input) {
      const existing = [...operators.values()].find(o => o.login === input.login);
      const record = existing ?? { operatorId: randomUUID(), login: input.login, name: input.name };
      operators.set(record.operatorId, record);
      return record;
    },
    async touchOperator() {},
    async createSession(input) {
      const operator = operators.get(input.operatorId);
      if (operator === undefined) {
        throw new Error('unknown operator');
      }
      sessions.set(input.tokenHash, {
        sessionId: randomUUID(),
        expiresAt: input.expiresAt,
        operator,
        tokenHash: input.tokenHash,
        revokedAt: null,
      });
    },
    async findSession(tokenHash, now) {
      const session = sessions.get(tokenHash);
      return session && session.revokedAt === null && session.expiresAt > now ? session : null;
    },
    async revokeSession(sessionId, now) {
      sessions.forEach(s => {
        if (s.sessionId === sessionId) {
          s.revokedAt = now;
        }
      });
    },
    async createPlan(plan) {
      plans.set(plan.planId, { ...plan, usedAt: null });
    },
    async findPlan(planId) {
      return plans.get(planId) ?? null;
    },
    async markPlanUsed(planId, now) {
      const plan = plans.get(planId);
      if (plan === undefined || plan.usedAt !== null) {
        return false;
      }
      plans.set(planId, { ...plan, usedAt: now });
      return true;
    },
    async createUnlock(unlock, event) {
      unlocks.push({ ...unlock, revokedAt: null });
      events.push(event);
    },
    async listActiveUnlocks(operatorId, now) {
      return unlocks.filter(
        u => u.operatorId === operatorId && u.revokedAt === null && u.expiresAt > now
      );
    },
    async revokeUnlock(operatorId, unlockId, now) {
      const unlock = unlocks.find(
        u => u.unlockId === unlockId && u.operatorId === operatorId && u.revokedAt === null
      );
      if (unlock === undefined) {
        return false;
      }
      unlock.revokedAt = now;
      return true;
    },
    async revokeAllUnlocks(operatorId, now) {
      unlocks.filter(u => u.operatorId === operatorId).forEach(u => (u.revokedAt = now));
    },
    async appendAccessLog(entry: AccessLogEntry, staged) {
      accessLog.push(chainEntry(accessLog.at(-1)?.hash ?? GENESIS_HASH, entry));
      events.push(...staged);
    },
    async listHistory(operatorId, limit): Promise<HistoryRecord[]> {
      return accessLog
        .filter(e => e.operatorId === operatorId)
        .slice(-limit)
        .reverse()
        .map(({ at, rpc, kind, mode, outcome, errorCode, revealedFields }) => ({
          at,
          rpc,
          kind,
          mode,
          outcome,
          errorCode,
          revealedFields: [...revealedFields],
        }));
    },
  };
};

export type RecordedGrpcCall = {
  rpc: string;
  request: unknown;
  headers: Record<string, string>;
};

export type GrpcScript = (call: GrpcCall) => unknown | Promise<unknown>;

// Scripted caller. `honourDryRun` echoes x-dry-run-applied like a real adapter.
export const makeFakeGrpc = (script: GrpcScript, opts: { honourDryRun?: boolean } = {}) => {
  const calls: RecordedGrpcCall[] = [];
  const call = async (c: GrpcCall): Promise<GrpcResult> => {
    const headers = Object.fromEntries(
      Object.entries(c.metadata.getMap()).map(([k, v]) => [k, String(v)])
    );
    calls.push({ rpc: c.method.rpc, request: c.request, headers });
    const response = await script(c);
    const responseMetadata = new Metadata();
    if (c.metadata.get(DRY_RUN_HEADER)[0] === '1' && (opts.honourDryRun ?? true)) {
      responseMetadata.set(DRY_RUN_APPLIED_HEADER, '1');
    }
    return { response, responseMetadata };
  };
  return { call, calls };
};

export type FetchCall = { url: string; method: string; body: string | undefined };
export type FetchRoute = (call: FetchCall) => Response | Promise<Response>;

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const makeFakeFetch = (routes: Record<string, FetchRoute>) => {
  const calls: FetchCall[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    const url = String(input);
    const recorded = {
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : undefined,
    };
    calls.push(recorded);
    const route = routes[url];
    if (route === undefined) {
      throw new Error(`unexpected fetch ${url}`);
    }
    return route(recorded);
  };
  return { fetchFn, calls };
};

export type HarnessOptions = {
  env?: OpsEnv;
  authMode?: 'github' | 'local';
  discordWebhookUrl?: string;
  fetchFn?: typeof fetch;
  grpc?: GrpcScript;
  honourDryRun?: boolean;
  clock?: { now: Date };
};

export const makeHarness = (opts: HarnessOptions = {}) => {
  const env = opts.env ?? 'dev';
  const authMode = opts.authMode ?? 'local';
  const clock = opts.clock ?? { now: new Date('2026-01-01T12:00:00.000Z') };
  const now = (): Date => new Date(clock.now);
  const store = makeFakeStore();
  const grpc = makeFakeGrpc(opts.grpc ?? (() => ({})), { honourDryRun: opts.honourDryRun });
  const fetchFn = opts.fetchFn ?? makeFakeFetch({}).fetchFn;
  const github =
    authMode === 'github'
      ? createGithubClient({ fetchFn, clientId: 'client-1', org: 'acme', team: 'ops' })
      : null;
  const auth = createAuthService({
    store,
    github,
    localLoginEnabled: authMode === 'local',
    sessionTtlHours: 8,
    now,
  });
  const invoke = createInvokeService({
    env,
    store,
    schema: PROTO_SCHEMA,
    resolveMethod: createMethodResolver(PROTO_SCHEMA),
    callGrpc: grpc.call,
    signingKey: 'k'.repeat(32),
    now,
    logger: SILENT_LOGGER,
  });
  const unlocks = createUnlocksService({
    env,
    store,
    discordWebhookUrl: opts.discordWebhookUrl,
    fetchFn,
    now,
    logger: SILENT_LOGGER,
    newId: randomUUID,
  });
  const app = createServer({
    config: { env, nodeEnv: 'test', authMode },
    logger: SILENT_LOGGER,
    auth,
    invoke,
    unlocks,
    store,
    schema: PROTO_SCHEMA,
    now,
  });

  const loginLocal = async (login = 'alice'): Promise<{ token: string; operatorId: string }> => {
    const res = await app.inject({ method: 'POST', url: '/v1/login/local', payload: { login } });
    const body = res.json<{ session: { token: string; operator: { operatorId: string } } }>();
    return { token: body.session.token, operatorId: body.session.operator.operatorId };
  };

  const post = (token: string, url: string, payload: unknown) =>
    app.inject({
      method: 'POST',
      url,
      payload: payload as object,
      headers: { authorization: `Bearer ${token}` },
    });

  return { app, store, grpc, clock, loginLocal, post, auth };
};
