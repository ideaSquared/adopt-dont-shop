import { randomUUID } from 'node:crypto';

import { Metadata } from '@grpc/grpc-js';

import type { Logger } from 'winston';

import type { Principal } from '@adopt-dont-shop/authz';
import type { DomainEvent } from '@adopt-dont-shop/events';
import {
  ADMIN_USERS_READ,
  type Permission,
  type RescueId,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import type {
  InvokePlan,
  InvokeRequest,
  InvokeResponse,
  InvokeResult,
  OpsEnv,
} from '@adopt-dont-shop/ops-contract';
import { REQUEST_ID_HEADER_NAME } from '@adopt-dont-shop/observability';
import type { ProtoSchema } from '@adopt-dont-shop/proto';
import {
  DRY_RUN_APPLIED_HEADER,
  DRY_RUN_HEADER,
  principalToMetadata,
} from '@adopt-dont-shop/service-bootstrap';

import { sha256Hex, type AccessLogEntry } from './access-chain.js';
import type { AuthContext } from './auth.js';
import { canonicalJson } from './canonical-json.js';
import { DEMO_EMAIL_PATTERN } from './demo-rescue.js';
import { fromGrpcError, OpsError } from './errors.js';
import { piiRevealedEvent, writeExecutedEvent } from './events.js';
import { findApplicableUnlock, maskOrReveal, type MaskedResponse } from './masking.js';
import type { GrpcCaller, MethodResolver, ResolvedMethod } from './proto-methods.js';
import {
  getRegistryEntry,
  type CallDownstream,
  type JsonObject,
  type RegistryEntry,
} from './registry.js';
import type { OpsStore } from './store.js';

export const PLAN_TTL_MS = 10 * 60 * 1000;
const GRPC_TIMEOUT_MS = 15_000;
const NATIVE_DRY_RUN_FIELD = 'dryRun';

export type InvokeDeps = {
  env: OpsEnv;
  store: OpsStore;
  schema: ProtoSchema;
  resolveMethod: MethodResolver;
  callGrpc: GrpcCaller;
  signingKey: string;
  now: () => Date;
  logger: Logger;
};

type Trace = Pick<
  AccessLogEntry,
  'kind' | 'mode' | 'planId' | 'unlockId' | 'revealedFields' | 'requestHash'
>;

type PlanShape = Omit<
  InvokePlan,
  'rpc' | 'env' | 'hidden' | 'unlockable' | 'revealedBy' | 'durationMs'
>;
type ResultShape = Pick<InvokeResult, 'kind' | 'response'>;
type Finish = (masked: MaskedResponse, shape: ResultShape | PlanShape) => InvokeResponse;

type Outcome = { response: InvokeResponse; events: readonly DomainEvent[] };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// toJSON of a request message omits defaults, so presence means "set".
const isSet = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0);

const omitKey = (obj: JsonObject, key: string): JsonObject =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

const asJsonObject = (value: unknown): JsonObject => (isObject(value) ? value : {});

// Services receive a principal with no roles and only the given permissions.
// The brand casts below are the one place plain strings become UserId/RescueId.
const principalFor = (
  operatorId: string,
  permissions: readonly Permission[],
  rescueId: string | undefined
): Principal => ({
  userId: operatorId as UserId,
  roles: [],
  permissions: [...permissions],
  ...(rescueId === undefined ? {} : { rescueId: rescueId as RescueId }),
});

const mintPrincipal = (operatorId: string, entry: RegistryEntry, request: JsonObject): Principal =>
  principalFor(operatorId, entry.permissions, entry.scope?.(request).rescueId);

// Show the entry's revealOnExecute fields from the raw response, unmasked.
const revealGenerated = (
  masked: MaskedResponse,
  json: unknown,
  fields: readonly string[]
): MaskedResponse => {
  if (fields.length === 0 || !isObject(json) || !isObject(masked.response)) {
    return masked;
  }
  const shown = fields.filter(f => Object.hasOwn(json, f));
  const hidden = masked.hidden.filter(path => !shown.includes(path));
  return {
    ...masked,
    response: { ...masked.response, ...Object.fromEntries(shown.map(f => [f, json[f]])) },
    hidden,
    unlockable: hidden.length === 0 ? null : masked.unlockable,
  };
};

const resolveRequestMessage = (method: ResolvedMethod, request: JsonObject): unknown => {
  try {
    return method.input.fromJSON(request);
  } catch {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `The request does not fit ${method.inputType}`,
      'Check field names and value types with `pnpm ops <service> <command> --help`.'
    );
  }
};

export const createInvokeService = (deps: InvokeDeps) => {
  const { store, now } = deps;

  // fromJSON then toJSON: the canonical form that is hashed, previewed and executed.
  const normaliseRequest = (method: ResolvedMethod, raw: JsonObject): JsonObject => {
    const known = deps.schema.messages[method.inputType]?.fields ?? [];
    const unknown = Object.keys(raw).filter(
      k => !known.some(f => f.jsonName === k || f.name === k)
    );
    if (unknown.length > 0) {
      throw new OpsError(
        'INVALID_ARGUMENT',
        `Unknown request field(s) for ${method.rpc}: ${unknown.join(', ')}`,
        `Valid fields: ${known.map(f => f.jsonName).join(', ') || 'none'}.`
      );
    }
    return asJsonObject(method.input.toJSON(resolveRequestMessage(method, raw)));
  };

  const callDownstream = async (params: {
    method: ResolvedMethod;
    entry: RegistryEntry;
    request: JsonObject;
    operatorId: string;
    requestId: string;
    rollbackDryRun: boolean;
  }): Promise<unknown> =>
    callAs({
      ...params,
      principal: mintPrincipal(params.operatorId, params.entry, params.request),
    });

  const callAs = async (params: {
    method: ResolvedMethod;
    principal: Principal;
    request: JsonObject;
    requestId: string;
    rollbackDryRun: boolean;
  }): Promise<unknown> => {
    const { method, principal, request, requestId, rollbackDryRun } = params;
    const metadata: Metadata = principalToMetadata(principal, {
      signingKey: deps.signingKey,
    });
    metadata.set(REQUEST_ID_HEADER_NAME, requestId);
    if (rollbackDryRun) {
      metadata.set(DRY_RUN_HEADER, '1');
    }

    const result = await deps
      .callGrpc({
        method,
        request: resolveRequestMessage(method, request),
        metadata,
        timeoutMs: GRPC_TIMEOUT_MS,
      })
      .catch((err: unknown) => {
        throw fromGrpcError(method.rpc, err);
      });

    if (rollbackDryRun && result.responseMetadata.get(DRY_RUN_APPLIED_HEADER)[0] !== '1') {
      throw new OpsError(
        'INTERNAL',
        `service.${method.service} did not honour dry run`,
        `The write may have been APPLIED for real: check the target with a read, then deploy a service.${method.service} build with dry-run support.`
      );
    }
    return method.output.toJSON(result.response);
  };

  // A step may act as a user only when auth says it is a generated demo
  // adopter (demo email, adopter role). Anything else is refused before the
  // step's own call is made.
  const assertDemoAdopter = async (
    operatorId: string,
    requestId: string,
    userId: string
  ): Promise<void> => {
    const method = deps.resolveMethod('auth.AdminGetUser');
    if (method === undefined) {
      throw new OpsError(
        'INTERNAL',
        'auth.AdminGetUser is not in the proto schema',
        'Regenerate the proto schema and redeploy service.ops.'
      );
    }
    const json = asJsonObject(
      await callAs({
        method,
        principal: principalFor(operatorId, [ADMIN_USERS_READ], undefined),
        request: { userId },
        requestId,
        rollbackDryRun: false,
      })
    );
    const user = asJsonObject(json.user);
    const isDemoAdopter =
      typeof user.email === 'string' &&
      DEMO_EMAIL_PATTERN.test(user.email) &&
      user.userType === 'USER_ROLE_ADOPTER';
    if (!isDemoAdopter) {
      throw new OpsError(
        'INVALID_ARGUMENT',
        `Refusing to act as user ${userId}: not a generated demo adopter`,
        'Only accounts made by `pnpm ops demo` commands can be acted as.'
      );
    }
  };

  // For in-process commands: each step is a real call with its own principal.
  const downstreamFor = (operatorId: string, requestId: string): CallDownstream => {
    const verifiedActors = new Set<string>();
    return async (rpc, request, step) => {
      const method = deps.resolveMethod(rpc);
      if (method === undefined) {
        throw new OpsError(
          'INTERNAL',
          `${rpc} is not in the proto schema`,
          'Regenerate the proto schema and redeploy service.ops.'
        );
      }
      const { actingUserId } = step;
      if (actingUserId !== undefined && !verifiedActors.has(actingUserId)) {
        await assertDemoAdopter(operatorId, requestId, actingUserId);
        verifiedActors.add(actingUserId);
      }
      const json = await callAs({
        method,
        principal: principalFor(actingUserId ?? operatorId, step.permissions, step.rescueId),
        request,
        requestId,
        rollbackDryRun: false,
      });
      return asJsonObject(json);
    };
  };

  const maskFor = (
    messageName: string,
    json: unknown,
    entry: RegistryEntry,
    request: JsonObject,
    unlocks: Awaited<ReturnType<OpsStore['listActiveUnlocks']>>
  ): MaskedResponse => {
    const subject = entry.subject?.(request) ?? null;
    return maskOrReveal({
      schema: deps.schema,
      messageName,
      json,
      subject,
      unlock: findApplicableUnlock(unlocks, subject),
    });
  };

  const run = async (
    ctx: AuthContext,
    body: InvokeRequest,
    requestId: string,
    trace: { current: Trace }
  ): Promise<Outcome> => {
    const started = performance.now();
    const operatorId = ctx.operator.operatorId;
    const mode = body.mode ?? 'preview';

    const entry = getRegistryEntry(body.rpc);
    if (entry === undefined) {
      throw new OpsError(
        'NOT_ENABLED',
        `${body.rpc} is not enabled in the ops registry`,
        'List enabled commands with `pnpm ops <service>`; add new ones in services/ops/src/registry.ts.'
      );
    }
    trace.current = {
      ...trace.current,
      kind: entry.kind,
      mode: entry.kind === 'read' ? 'run' : mode,
    };
    if (entry.envs !== undefined && !entry.envs.includes(deps.env)) {
      throw new OpsError(
        'NOT_ENABLED',
        `${body.rpc} is not enabled in ${deps.env}`,
        `It runs in: ${entry.envs.join(', ')}.`
      );
    }

    const method = deps.resolveMethod(body.rpc);
    if (method === undefined) {
      throw new OpsError(
        'INTERNAL',
        `${body.rpc} is in the registry but not in the proto schema`,
        'Regenerate the proto schema (pnpm --filter @adopt-dont-shop/proto generate) and redeploy service.ops.'
      );
    }

    const normalised = normaliseRequest(method, body.request);
    entry.validate?.(normalised);
    const native = entry.kind === 'write' && entry.dryRun === 'native';
    // The native dry-run flag is service.ops's to set, so it is not part of what a
    // plan binds: preview (flag on) and execute (flag off) hash identically.
    const hashable = native ? omitKey(normalised, NATIVE_DRY_RUN_FIELD) : normalised;
    const requestHash = sha256Hex(
      canonicalJson({ env: deps.env, rpc: body.rpc, request: hashable, operatorId })
    );
    trace.current = { ...trace.current, requestHash };

    const unlocks = await store.listActiveUnlocks(operatorId, now());
    const subject = entry.subject?.(normalised) ?? null;
    const unlock = findApplicableUnlock(unlocks, subject);
    const lookedUpPii = (entry.piiRequestFields ?? []).some(f => isSet(normalised[f]));
    if (lookedUpPii && unlock === undefined) {
      throw new OpsError(
        'UNLOCK_REQUIRED',
        `${body.rpc} was called with a PII lookup field (${(entry.piiRequestFields ?? []).join(', ')}) and no unlock is active`,
        'Unlock first (`pnpm ops unlock any`, or `pnpm ops unlock user <id>`), then retry.'
      );
    }

    const finish: Finish = (masked, shape) => {
      // Contract schemas are applied at the route boundary; this is the common tail.
      const common = {
        rpc: body.rpc,
        env: deps.env,
        hidden: [...masked.hidden],
        unlockable: masked.unlockable,
        revealedBy: masked.revealedBy,
        durationMs: Math.round(performance.now() - started),
      };
      return { ...common, ...shape };
    };

    const revealEvents = (masked: MaskedResponse): readonly DomainEvent[] => {
      if (masked.revealedBy === null) {
        return [];
      }
      trace.current = {
        ...trace.current,
        unlockId: masked.revealedBy,
        revealedFields: [...masked.revealedFields],
      };
      return [
        piiRevealedEvent({
          operatorId,
          rpc: body.rpc,
          unlockId: masked.revealedBy,
          revealedFields: masked.revealedFields,
          now: now(),
        }),
      ];
    };

    if (entry.kind === 'read') {
      const json = await callDownstream({
        method,
        entry,
        request: normalised,
        operatorId,
        requestId,
        rollbackDryRun: false,
      });
      const masked = maskFor(method.outputType, json, entry, normalised, unlocks);
      return {
        response: finish(masked, { kind: 'result', response: masked.response }),
        events: revealEvents(masked),
      };
    }

    if (mode === 'preview') {
      return preview({
        ctx,
        entry,
        method,
        normalised,
        hashable,
        requestHash,
        requestId,
        unlocks,
        finish,
        revealEvents,
      });
    }

    // ---- write execute ----------------------------------------------------
    const plan = await validatePlan({ ctx, body, requestHash });
    if (deps.env === 'prod' && body.confirm !== 'prod') {
      throw new OpsError(
        'CONFIRMATION_REQUIRED',
        'Executing a write in prod needs explicit confirmation',
        'Re-run with --confirm prod.'
      );
    }
    if (!(await store.markPlanUsed(plan.planId, now()))) {
      throw new OpsError(
        'PLAN_EXPIRED',
        'This plan was already used',
        'Preview again to get a new planId.'
      );
    }
    trace.current = { ...trace.current, planId: plan.planId };

    const executeRequest = native ? { ...hashable, [NATIVE_DRY_RUN_FIELD]: false } : normalised;
    const json =
      entry.local === undefined
        ? await callDownstream({
            method,
            entry,
            request: executeRequest,
            operatorId,
            requestId,
            rollbackDryRun: false,
          })
        : method.output.toJSON(
            method.output.fromJSON(
              await entry.local(normalised, downstreamFor(operatorId, requestId))
            )
          );
    const masked = revealGenerated(
      maskFor(method.outputType, json, entry, normalised, unlocks),
      json,
      entry.revealOnExecute ?? []
    );
    return {
      response: finish(masked, { kind: 'result', response: masked.response }),
      events: [
        writeExecutedEvent({
          operatorId,
          rpc: body.rpc,
          planId: plan.planId,
          requestHash,
          now: now(),
        }),
        ...revealEvents(masked),
      ],
    };
  };

  const preview = async (p: {
    ctx: AuthContext;
    entry: RegistryEntry;
    method: ResolvedMethod;
    normalised: JsonObject;
    hashable: JsonObject;
    requestHash: string;
    requestId: string;
    unlocks: Awaited<ReturnType<OpsStore['listActiveUnlocks']>>;
    finish: Finish;
    revealEvents: (masked: MaskedResponse) => readonly DomainEvent[];
  }): Promise<Outcome> => {
    const { entry, method, normalised, requestId } = p;
    if (entry.kind !== 'write') {
      throw new OpsError('INTERNAL', 'preview of a read RPC', 'This is a bug in service.ops.');
    }
    const operatorId = p.ctx.operator.operatorId;

    const dryResponse = async (): Promise<unknown> => {
      if (entry.dryRun === 'preview-only') {
        return null;
      }
      if (entry.dryRun === 'rollback') {
        return callDownstream({
          method,
          entry,
          request: normalised,
          operatorId,
          requestId,
          rollbackDryRun: true,
        });
      }
      const hasFlag = deps.schema.messages[method.inputType]?.fields.some(
        f => f.jsonName === NATIVE_DRY_RUN_FIELD
      );
      if (!hasFlag) {
        throw new OpsError(
          'INTERNAL',
          `${method.rpc} is registered as a native dry run but ${method.inputType} has no ${NATIVE_DRY_RUN_FIELD} field`,
          'Fix the registry entry in services/ops/src/registry.ts.'
        );
      }
      return callDownstream({
        method,
        entry,
        request: { ...p.hashable, [NATIVE_DRY_RUN_FIELD]: true },
        operatorId,
        requestId,
        rollbackDryRun: false,
      });
    };

    const dryJson = await dryResponse();
    const maskedRequest = maskFor(method.inputType, p.hashable, entry, normalised, p.unlocks);
    const maskedResponse =
      dryJson === null ? null : maskFor(method.outputType, dryJson, entry, normalised, p.unlocks);

    const planId = randomUUID();
    const at = now();
    const expiresAt = new Date(at.getTime() + PLAN_TTL_MS);
    await store.createPlan(
      { planId, operatorId, rpc: method.rpc, requestHash: p.requestHash, expiresAt },
      at
    );

    const combined: MaskedResponse = {
      response: null,
      hidden: [
        ...maskedRequest.hidden.map(path => `request.${path}`),
        ...(maskedResponse?.hidden ?? []).map(path => `response.${path}`),
      ],
      unlockable: maskedResponse?.unlockable ?? maskedRequest.unlockable,
      revealedBy: maskedResponse?.revealedBy ?? maskedRequest.revealedBy,
      revealedFields: [],
    };
    const events = [maskedRequest, ...(maskedResponse === null ? [] : [maskedResponse])].flatMap(
      p.revealEvents
    );
    const planShape: PlanShape = {
      kind: 'plan',
      planId,
      expiresAt: expiresAt.toISOString(),
      dryRun: entry.dryRun,
      request: maskedRequest.response,
      response: maskedResponse === null ? null : maskedResponse.response,
      warnings: [...(entry.warnings ?? [])],
    };
    return { response: p.finish(combined, planShape), events };
  };

  const validatePlan = async (p: {
    ctx: AuthContext;
    body: InvokeRequest;
    requestHash: string;
  }) => {
    if (p.body.planId === undefined) {
      throw new OpsError(
        'PLAN_REQUIRED',
        'A write needs the planId of a preview of the same request',
        'Preview first (omit --execute), review the plan, then re-run with its planId.'
      );
    }
    const plan = await store.findPlan(p.body.planId);
    const mismatch = new OpsError(
      'PLAN_MISMATCH',
      'The planId does not match this environment, rpc, request and operator',
      'Preview the exact request again and use the planId it returns.'
    );
    if (
      plan === null ||
      plan.operatorId !== p.ctx.operator.operatorId ||
      plan.rpc !== p.body.rpc ||
      plan.requestHash !== p.requestHash
    ) {
      throw mismatch;
    }
    if (plan.usedAt !== null || plan.expiresAt.getTime() <= now().getTime()) {
      throw new OpsError(
        'PLAN_EXPIRED',
        'This plan expired or was already used',
        'Preview again to get a new planId (plans last 10 minutes and are single-use).'
      );
    }
    return plan;
  };

  // Every invoke, ok or error, appends one access_log row. If the row cannot be
  // written the response is withheld: no un-logged reads or writes.
  const invoke = async (
    ctx: AuthContext,
    body: InvokeRequest,
    requestId: string
  ): Promise<InvokeResponse> => {
    const trace: { current: Trace } = {
      current: {
        kind: 'read',
        mode: 'run',
        planId: null,
        unlockId: null,
        revealedFields: [],
        requestHash: null,
      },
    };
    const started = performance.now();
    const outcome = await run(ctx, body, requestId, trace).then(
      (ok): { ok: Outcome } => ({ ok }),
      (err: unknown): { err: OpsError } => ({
        err:
          err instanceof OpsError
            ? err
            : new OpsError('INTERNAL', 'Unexpected failure', 'Check the service.ops logs.'),
      })
    );

    const entry: AccessLogEntry = {
      at: now().toISOString(),
      operatorId: ctx.operator.operatorId,
      rpc: body.rpc,
      ...trace.current,
      outcome: 'ok' in outcome ? 'ok' : 'error',
      errorCode: 'err' in outcome ? outcome.err.code : null,
    };
    const events = 'ok' in outcome ? outcome.ok.events : [];
    await store.appendAccessLog(entry, events).catch((err: unknown) => {
      deps.logger.error('access log append failed', {
        rpc: body.rpc,
        operator: ctx.operator.login,
        message: err instanceof Error ? err.message : 'unknown',
      });
      throw new OpsError(
        'INTERNAL',
        entry.mode === 'execute' && 'ok' in outcome
          ? 'The write was applied but the access log could not be written'
          : 'The access log could not be written, so the response was withheld',
        'Check the ops database, then verify the target state with a read.'
      );
    });

    deps.logger.info('invoke', {
      rpc: body.rpc,
      operator: ctx.operator.login,
      kind: entry.kind,
      mode: entry.mode,
      outcome: entry.outcome,
      errorCode: entry.errorCode,
      revealedFieldCount: entry.revealedFields.length,
      durationMs: Math.round(performance.now() - started),
    });

    if ('err' in outcome) {
      throw outcome.err;
    }
    return outcome.ok.response;
  };

  return { invoke };
};

export type InvokeService = ReturnType<typeof createInvokeService>;
