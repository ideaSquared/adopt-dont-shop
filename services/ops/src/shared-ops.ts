import { randomUUID } from 'node:crypto';

import {
  createOpsHandler,
  OpsError as SharedOpsError,
  type Access,
  type Field,
  type OpsCommand,
  type OpsHandler,
  type OpsLogger,
} from '@ideasquared/ops';

import {
  LocalLoginRequestSchema,
  type CatalogEnum,
  type CatalogField,
  type CatalogMethod,
  type CatalogResponse,
  type InvokeResponse,
  type OpsEnv,
  type OpsErrorCode,
} from '@adopt-dont-shop/ops-contract';
import type { ProtoSchema } from '@adopt-dont-shop/proto';

import { buildCatalog } from './catalog.js';
import { OpsError } from './errors.js';
import type { GithubClient } from './github.js';
import type { Caller, InvokeService } from './invoke.js';
import { getRegistryEntry, splitRpc } from './registry.js';
import type { OperatorRecord, OpsStore } from './store.js';

// Serves the shared @ideasquared/ops contract (the one `eng ops` speaks) in front of the same invoke path the
// `pnpm ops` CLI uses, so the minted principal, masking, dry run and audit trail are the existing ones. Differences
// from /v1: unlocks are never applied (masked stays masked) and PII lookup fields are not offered, both on the safe
// side; and a prod write is confirmed by eng (typing the product name) rather than by /v1's --confirm prod.

export const SHARED_OPS_BASE_PATH = '/ops/v1';

// The operator a local-mode bearer token maps to when it is not itself a valid login name.
const LOCAL_FALLBACK_LOGIN = 'local-dev';

const NUMBER_TYPES: ReadonlySet<string> = new Set([
  'int32',
  'int64',
  'uint32',
  'uint64',
  'sint32',
  'sint64',
  'fixed32',
  'fixed64',
  'sfixed32',
  'sfixed64',
  'double',
  'float',
]);

// The request field the service sets itself on a native dry run.
const NATIVE_DRY_RUN_FIELD = 'dryRun';

export type SharedExclusion = { rpc: string; reason: string };

type FieldVerdict =
  | { verdict: 'field'; field: Field }
  | { verdict: 'omit' }
  | { verdict: 'unsupported'; reason: string };

const describe = (field: CatalogField, note?: string): string =>
  [field.comment ?? field.name, note].filter(part => part !== undefined).join(' ');

const mapEnum = (field: CatalogField, enums: Record<string, CatalogEnum>): FieldVerdict => {
  const values = (enums[field.typeName ?? '']?.values ?? [])
    .filter(value => value.number !== 0)
    .map(value => value.name);
  return values.length === 0
    ? { verdict: 'unsupported', reason: `enum field ${field.jsonName} has no usable values` }
    : {
        verdict: 'field',
        field: {
          name: field.jsonName,
          type: 'enum',
          required: false,
          description: describe(field),
          values,
        },
      };
};

// Fail closed, the way masking does: a PII or SPECIAL field is never offered, and neither is free text nobody
// annotated (masking would hide it in a response, so it is treated as personal data in a request too).
const isPersonalOrUndetermined = (field: CatalogField): boolean =>
  field.sensitivity === 'PII' ||
  field.sensitivity === 'SPECIAL' ||
  (field.sensitivity === null && field.kind === 'scalar' && field.scalarType === 'string');

const mapField = (
  field: CatalogField,
  method: CatalogMethod,
  enums: Record<string, CatalogEnum>
): FieldVerdict => {
  const isNativeDryRunFlag = method.dryRun === 'native' && field.jsonName === NATIVE_DRY_RUN_FIELD;
  if (
    isNativeDryRunFlag ||
    method.piiRequestFields.includes(field.jsonName) ||
    isPersonalOrUndetermined(field)
  ) {
    return { verdict: 'omit' };
  }
  if (field.repeated || field.kind === 'map' || field.kind === 'message') {
    return { verdict: 'unsupported', reason: `field ${field.jsonName} is nested or repeated` };
  }
  if (field.kind === 'enum') {
    return mapEnum(field, enums);
  }
  const type = field.scalarType ?? '';
  const base = { name: field.jsonName, description: describe(field) };
  if (type === 'string') {
    // Proto3 strings default to empty, so only an explicitly optional one may be left out.
    const required = !field.optional;
    return {
      verdict: 'field',
      field: {
        ...base,
        type: field.jsonName.endsWith('Id') ? 'id' : 'string',
        required,
        positional: required,
      },
    };
  }
  if (type === 'bool') {
    return { verdict: 'field', field: { ...base, type: 'boolean', required: false } };
  }
  if (NUMBER_TYPES.has(type)) {
    return { verdict: 'field', field: { ...base, type: 'number', required: false } };
  }
  return { verdict: 'unsupported', reason: `field ${field.jsonName} is of type ${type}` };
};

const exclusionFor = (
  method: CatalogMethod,
  verdicts: readonly FieldVerdict[]
): string | undefined => {
  const entry = getRegistryEntry(method.rpc);
  if (entry?.kind === 'write' && entry.local !== undefined) {
    return 'chains several RPCs as generated demo users; stays in `pnpm ops demo`';
  }
  return verdicts.find(
    (v): v is Extract<FieldVerdict, { verdict: 'unsupported' }> => v.verdict === 'unsupported'
  )?.reason;
};

type Planned = { method: CatalogMethod; fields: Field[] };

const plan = (catalog: CatalogResponse): { planned: Planned[]; excluded: SharedExclusion[] } => {
  const methods = catalog.services.flatMap(service => service.methods);
  const results = methods.map(method => {
    const message = catalog.messages[method.inputType];
    const verdicts = (message?.fields ?? []).map(field => mapField(field, method, catalog.enums));
    const reason =
      message === undefined
        ? 'request type missing from the catalog'
        : exclusionFor(method, verdicts);
    return {
      method,
      reason,
      fields: verdicts.flatMap(v => (v.verdict === 'field' ? [v.field] : [])),
    };
  });
  return {
    planned: results.flatMap(r =>
      r.reason === undefined ? [{ method: r.method, fields: r.fields }] : []
    ),
    excluded: results.flatMap(r =>
      r.reason === undefined ? [] : [{ rpc: r.method.rpc, reason: r.reason }]
    ),
  };
};

// The ops contract has five error codes; the service's richer ones fold into them, and the hint rides in the message.
const SHARED_CODE: Readonly<Record<OpsErrorCode, ConstructorParameters<typeof SharedOpsError>[0]>> =
  {
    INVALID_ARGUMENT: 'invalid_argument',
    UNAUTHENTICATED: 'unauthenticated',
    PERMISSION_DENIED: 'forbidden',
    NOT_FOUND: 'not_found',
    ALREADY_EXISTS: 'invalid_argument',
    FAILED_PRECONDITION: 'invalid_argument',
    NOT_ENABLED: 'forbidden',
    PLAN_REQUIRED: 'internal',
    PLAN_MISMATCH: 'internal',
    PLAN_EXPIRED: 'internal',
    CONFIRMATION_REQUIRED: 'forbidden',
    UNLOCK_REQUIRED: 'forbidden',
    UNLOCKS_DISABLED: 'forbidden',
    UNAVAILABLE: 'internal',
    INTERNAL: 'internal',
  };

const translate = (err: unknown): unknown =>
  err instanceof OpsError
    ? new SharedOpsError(SHARED_CODE[err.code], `${err.message}. ${err.hint}`)
    : err;

const hiddenSummary = (hidden: readonly string[]): string | undefined =>
  hidden.length === 0
    ? undefined
    : `${hidden.length} masked field(s). Unlocks are not available here; use \`pnpm ops\`.`;

const toOutput = (response: InvokeResponse): { result: unknown; summary?: string } => {
  const note = hiddenSummary(response.hidden);
  if (response.kind === 'result') {
    return { result: response.response, ...(note === undefined ? {} : { summary: note }) };
  }
  return {
    result: {
      dryRun: response.dryRun,
      request: response.request,
      response: response.response,
      warnings: response.warnings,
    },
    summary: ['Preview only: nothing was changed.', note].filter(Boolean).join(' '),
  };
};

export type SharedOpsDeps = {
  env: OpsEnv;
  schema: ProtoSchema;
  store: OpsStore;
  invoke: InvokeService;
  // null in OPS_AUTH_MODE=local, which config only allows with NODE_ENV=development and OPS_ENV=dev.
  github: GithubClient | null;
  fetchFn: typeof fetch;
  now: () => Date;
  logger: OpsLogger;
};

const asCaller = (operator: OperatorRecord): Caller => ({
  operator: { operatorId: operator.operatorId, login: operator.login, name: operator.name },
});

export const buildSharedCommands = (
  deps: Pick<SharedOpsDeps, 'env' | 'schema' | 'invoke'>,
  callerFor: (login: string) => Caller
): { commands: OpsCommand[]; excluded: SharedExclusion[] } => {
  const { planned, excluded } = plan(buildCatalog(deps.env, deps.schema));
  const commands = planned.map(({ method, fields }): OpsCommand => {
    const { service } = splitRpc(method.rpc);
    const write = method.kind === 'write';
    const invoke = (
      login: string,
      request: Record<string, unknown>,
      mode: 'preview' | 'execute',
      planId?: string
    ) =>
      deps.invoke
        .invoke(
          callerFor(login),
          {
            rpc: method.rpc,
            request,
            mode,
            ...(planId === undefined ? {} : { planId }),
            // eng makes the operator type the product name before a prod write (and --yes never skips it), so a
            // run that reaches execute here has been confirmed; /v1 asks for its own --confirm prod.
            ...(mode === 'execute' && deps.env === 'prod' ? { confirm: 'prod' } : {}),
          },
          randomUUID(),
          { unlocks: 'ignore' }
        )
        .catch((err: unknown) => {
          throw translate(err);
        });
    return {
      id: `${service}.${method.command}`,
      group: service,
      name: method.command,
      summary: method.summary,
      kind: method.kind,
      fields,
      dryRun: write,
      // A read ignores the mode. A write previews first, with the same dry run `pnpm ops` shows, and only then
      // executes the plan it just made, so a preview that fails stops the write.
      async run(args, ctx) {
        if (!write) {
          return toOutput(await invoke(ctx.login, args, 'preview'));
        }
        const planned = await invoke(ctx.login, args, 'preview');
        if (planned.kind !== 'plan') {
          throw new SharedOpsError('internal', 'the preview did not return a plan');
        }
        return toOutput(await invoke(ctx.login, args, 'execute', planned.planId));
      },
      ...(write
        ? {
            async preview(args: Record<string, unknown>, ctx: { login: string }) {
              return toOutput(await invoke(ctx.login, args, 'preview'));
            },
          }
        : {}),
    };
  });
  return { commands, excluded };
};

export const createSharedOpsHandler = (deps: SharedOpsDeps): OpsHandler => {
  // authorize resolves who the caller is; the commands then act as that operator. Keyed by login, which is all the
  // handler passes on.
  const operators = new Map<string, OperatorRecord>();

  const callerFor = (login: string): Caller => {
    const operator = operators.get(login);
    if (operator === undefined) {
      throw new SharedOpsError('internal', 'the caller was not authorised');
    }
    return asCaller(operator);
  };

  const remember = async (operator: OperatorRecord): Promise<Access> => {
    operators.set(operator.login, operator);
    await deps.store.touchOperator(operator.operatorId, deps.now());
    return { outcome: 'allowed', login: operator.login };
  };

  const authorizeGithub = async (github: GithubClient, token: string): Promise<Access> => {
    const access = await github.authorizeToken(token);
    if (access.outcome === 'unauthenticated') {
      return access;
    }
    if (access.outcome === 'denied') {
      return { outcome: 'denied', login: access.identity.login };
    }
    const { login, githubId, name } = access.identity;
    return remember(await deps.store.upsertGithubOperator({ login, githubId, name }, deps.now()));
  };

  // Local mode (dev only) vouches for anyone, as /v1/login/local does: a token that is a valid login name is that
  // login, anything else (a real `gh auth token`) is the fixed local-dev operator.
  const authorizeLocal = async (token: string): Promise<Access> => {
    const named = LocalLoginRequestSchema.shape.login.safeParse(token);
    const login = named.success ? named.data : LOCAL_FALLBACK_LOGIN;
    return remember(await deps.store.upsertLocalOperator({ login }, deps.now()));
  };

  const { commands } = buildSharedCommands(deps, callerFor);
  return createOpsHandler({
    product: 'adopt-dont-shop',
    environment: deps.env,
    commands,
    authorize: token =>
      deps.github === null ? authorizeLocal(token) : authorizeGithub(deps.github, token),
    fetch: deps.fetchFn,
    logger: deps.logger,
  });
};
