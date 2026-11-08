// HTTP contract between the `ads-ops` CLI and service.ops.
//
// Every route lives under `/v1`. Authenticated routes take
// `Authorization: Bearer <session token>`. Every error response, on any
// route, has the `ErrorResponse` shape with a matching HTTP status
// (see ERROR_HTTP_STATUS).
//
// Zod schema first, type inferred — the CLI parses every response with
// these schemas, and service.ops parses every request body with them.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

export const OpsEnvSchema = z.enum(['dev', 'staging', 'prod']);
export type OpsEnv = z.infer<typeof OpsEnvSchema>;

// Every /v1 request carries the environment the CLI believes it is talking
// to. service.ops rejects a mismatch with FAILED_PRECONDITION before doing
// anything else, so a tunnel forwarded to the wrong stack (e.g. the staging
// port pointing at prod) can never log in, read or unlock there.
export const EXPECTED_ENV_HEADER = 'x-ops-expected-env';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const OpsErrorCodeSchema = z.enum([
  'INVALID_ARGUMENT', // malformed body / request JSON does not fit the proto
  'UNAUTHENTICATED', // missing, unknown, expired or revoked session
  'PERMISSION_DENIED', // downstream handler refused the minted principal
  'NOT_FOUND', // downstream NOT_FOUND
  'ALREADY_EXISTS',
  'FAILED_PRECONDITION',
  'NOT_ENABLED', // RPC is not in the ops registry
  'PLAN_REQUIRED', // write executed without a planId
  'PLAN_MISMATCH', // planId does not match env + rpc + request + operator
  'PLAN_EXPIRED', // planId expired or already used
  'CONFIRMATION_REQUIRED', // prod execute without confirm === 'prod'
  'UNLOCK_REQUIRED', // request carries PII fields and no unlock is active
  'UNLOCKS_DISABLED', // break-glass alerting is not configured, so unlocks are refused
  'UNAVAILABLE', // downstream service unreachable
  'INTERNAL',
]);
export type OpsErrorCode = z.infer<typeof OpsErrorCodeSchema>;

export const ERROR_HTTP_STATUS: Record<OpsErrorCode, number> = {
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  FAILED_PRECONDITION: 412,
  NOT_ENABLED: 403,
  PLAN_REQUIRED: 428,
  PLAN_MISMATCH: 409,
  PLAN_EXPIRED: 410,
  CONFIRMATION_REQUIRED: 428,
  UNLOCK_REQUIRED: 403,
  UNLOCKS_DISABLED: 503,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: OpsErrorCodeSchema,
    message: z.string(),
    // One-line, actionable next step for a human ("Run `pnpm ops login`").
    hint: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ---------------------------------------------------------------------------
// Operators, sessions
// ---------------------------------------------------------------------------

export const OperatorSchema = z.object({
  operatorId: z.uuid(),
  login: z.string(), // GitHub login (or the local login in dev)
  name: z.string().nullable(),
});
export type Operator = z.infer<typeof OperatorSchema>;

export const SessionSchema = z.object({
  token: z.string().min(32),
  expiresAt: z.iso.datetime(),
  operator: OperatorSchema,
});
export type Session = z.infer<typeof SessionSchema>;

// POST /v1/login/start  (no body) → LoginStartResponse
// Starts a GitHub device-flow login. The CLI shows `userCode` and opens
// `verificationUri`, then polls /v1/login/poll every `interval` seconds.
export const LoginStartResponseSchema = z.object({
  deviceCode: z.string(),
  userCode: z.string(),
  verificationUri: z.url(),
  interval: z.number().int().positive(),
  expiresIn: z.number().int().positive(),
});
export type LoginStartResponse = z.infer<typeof LoginStartResponseSchema>;

// POST /v1/login/poll  LoginPollRequest → LoginPollResponse
export const LoginPollRequestSchema = z.object({ deviceCode: z.string().min(1) });
export type LoginPollRequest = z.infer<typeof LoginPollRequestSchema>;

export const LoginPollResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('slow_down'), interval: z.number().int().positive() }),
  z.object({ status: z.literal('expired') }),
  // Authenticated with GitHub but not in the env's ops team.
  z.object({ status: z.literal('denied'), reason: z.string() }),
  z.object({ status: z.literal('ok'), session: SessionSchema }),
]);
export type LoginPollResponse = z.infer<typeof LoginPollResponseSchema>;

// POST /v1/login/local  LocalLoginRequest → LocalLoginResponse
// Dev only: service.ops registers this route only when OPS_AUTH_MODE=local,
// which its config refuses outside NODE_ENV=development.
export const LocalLoginRequestSchema = z.object({
  login: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[A-Za-z0-9-]+$/),
});
export type LocalLoginRequest = z.infer<typeof LocalLoginRequestSchema>;
export const LocalLoginResponseSchema = z.object({ session: SessionSchema });
export type LocalLoginResponse = z.infer<typeof LocalLoginResponseSchema>;

// POST /v1/logout → 204 (revokes the presented session)

// ---------------------------------------------------------------------------
// Unlocks (break-glass)
// ---------------------------------------------------------------------------

// What an unlock covers. `any` reveals PII on every RPC for its lifetime;
// the others reveal PII only on responses whose registry subject matches.
export const SubjectTypeSchema = z.enum(['user', 'rescue', 'application', 'any']);
export type SubjectType = z.infer<typeof SubjectTypeSchema>;

export const UnlockSchema = z.object({
  unlockId: z.uuid(),
  subjectType: SubjectTypeSchema,
  subjectId: z.string().nullable(), // null iff subjectType === 'any'
  reason: z.string(),
  ticket: z.string(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});
export type Unlock = z.infer<typeof UnlockSchema>;

export const UNLOCK_DEFAULT_TTL_MINUTES = 30;
export const UNLOCK_MAX_TTL_MINUTES = 60;
export const TICKET_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

// POST /v1/unlocks  CreateUnlockRequest → { unlock: Unlock }
export const CreateUnlockRequestSchema = z
  .object({
    subjectType: SubjectTypeSchema,
    subjectId: z.string().min(1).nullable(),
    reason: z.string().trim().min(10).max(500),
    ticket: z.string().regex(TICKET_PATTERN),
    ttlMinutes: z.number().int().min(1).max(UNLOCK_MAX_TTL_MINUTES).optional(),
  })
  .refine(u => (u.subjectType === 'any') === (u.subjectId === null), {
    message: "subjectId must be null for 'any' and set for every other subject type",
    path: ['subjectId'],
  });
export type CreateUnlockRequest = z.infer<typeof CreateUnlockRequestSchema>;
export const CreateUnlockResponseSchema = z.object({ unlock: UnlockSchema });
export type CreateUnlockResponse = z.infer<typeof CreateUnlockResponseSchema>;

// GET /v1/unlocks → { unlocks: Unlock[] }   (caller's active unlocks)
// DELETE /v1/unlocks → 204                   (revoke all of caller's unlocks)
// DELETE /v1/unlocks/:unlockId → 204
export const ListUnlocksResponseSchema = z.object({ unlocks: z.array(UnlockSchema) });
export type ListUnlocksResponse = z.infer<typeof ListUnlocksResponseSchema>;

// ---------------------------------------------------------------------------
// whoami
// ---------------------------------------------------------------------------

// GET /v1/whoami → WhoamiResponse
export const WhoamiResponseSchema = z.object({
  env: OpsEnvSchema,
  operator: OperatorSchema,
  sessionExpiresAt: z.iso.datetime(),
  unlocks: z.array(UnlockSchema),
});
export type WhoamiResponse = z.infer<typeof WhoamiResponseSchema>;

// ---------------------------------------------------------------------------
// Catalog — what the caller may invoke, plus the proto schema slice the CLI
// needs to build flags, help text and completion.
// ---------------------------------------------------------------------------

export const SensitivitySchema = z.enum(['PUBLIC', 'INTERNAL', 'PII', 'SPECIAL']);
export type Sensitivity = z.infer<typeof SensitivitySchema>;

export const ScalarTypeSchema = z.enum([
  'string',
  'bytes',
  'bool',
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
export type ScalarType = z.infer<typeof ScalarTypeSchema>;

export const CatalogFieldSchema = z.object({
  name: z.string(), // proto name, snake_case
  jsonName: z.string(), // camelCase, as accepted by ts-proto fromJSON
  kind: z.enum(['scalar', 'enum', 'message', 'map']),
  scalarType: ScalarTypeSchema.optional(), // kind === 'scalar'
  typeName: z.string().optional(), // fully-qualified, kind === 'enum' | 'message'
  repeated: z.boolean(),
  optional: z.boolean(),
  sensitivity: SensitivitySchema.nullable(), // null = not annotated
  comment: z.string().optional(),
});
export type CatalogField = z.infer<typeof CatalogFieldSchema>;

export const CatalogMessageSchema = z.object({
  fullName: z.string(),
  fields: z.array(CatalogFieldSchema),
});
export type CatalogMessage = z.infer<typeof CatalogMessageSchema>;

export const CatalogEnumSchema = z.object({
  fullName: z.string(),
  values: z.array(z.object({ name: z.string(), number: z.number().int() })),
});
export type CatalogEnum = z.infer<typeof CatalogEnumSchema>;

// How a write RPC is previewed.
//   rollback     — run for real inside a transaction that is always rolled back
//   native       — the RPC has its own dry_run field (e.g. notifications.Broadcast)
//   preview-only — has side effects outside Postgres; the preview only shows the
//                  validated request and the principal, nothing is called
export const DryRunModeSchema = z.enum(['rollback', 'native', 'preview-only']);
export type DryRunMode = z.infer<typeof DryRunModeSchema>;

export const CatalogMethodSchema = z.object({
  command: z.string(), // kebab-case CLI name, e.g. 'update-status'
  rpc: z.string(), // '<service>.<Method>', e.g. 'pets.UpdateStatus'
  kind: z.enum(['read', 'write']),
  dryRun: DryRunModeSchema.nullable(), // null iff kind === 'read'
  summary: z.string(),
  inputType: z.string(), // fully-qualified message name
  outputType: z.string(),
  // Request fields that make this a PII lookup (e.g. search by email). The
  // CLI offers an unlock before calling when any of them is set.
  piiRequestFields: z.array(z.string()),
});
export type CatalogMethod = z.infer<typeof CatalogMethodSchema>;

export const CatalogServiceSchema = z.object({
  name: z.string(), // CLI name, e.g. 'pets'
  fullName: z.string(), // e.g. 'adopt_dont_shop.pets.v1.PetService'
  methods: z.array(CatalogMethodSchema),
});
export type CatalogService = z.infer<typeof CatalogServiceSchema>;

// GET /v1/catalog → CatalogResponse
export const CatalogResponseSchema = z.object({
  env: OpsEnvSchema,
  services: z.array(CatalogServiceSchema),
  // Every message/enum reachable from the listed methods' input and output types.
  messages: z.record(z.string(), CatalogMessageSchema),
  enums: z.record(z.string(), CatalogEnumSchema),
});
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

// ---------------------------------------------------------------------------
// Invoke
// ---------------------------------------------------------------------------

// A masked value in a response is replaced by this marker object.
export const HIDDEN_MARKER_KEY = '$hidden';
export const HiddenMarkerSchema = z.object({ [HIDDEN_MARKER_KEY]: z.literal(true) });
export type HiddenMarker = z.infer<typeof HiddenMarkerSchema>;

export const isHiddenMarker = (value: unknown): value is HiddenMarker =>
  typeof value === 'object' &&
  value !== null &&
  (value as Record<string, unknown>)[HIDDEN_MARKER_KEY] === true;

// POST /v1/invoke  InvokeRequest → InvokeResponse
//
//   read  RPC                      → runs, returns kind 'result'
//   write RPC, mode 'preview'      → dry run, returns kind 'plan'
//   write RPC, mode 'execute'      → needs planId from a preview of the exact
//                                    same env + rpc + request by the same
//                                    operator, unexpired and unused; in prod
//                                    also confirm === 'prod'. Returns 'result'.
export const InvokeRequestSchema = z.object({
  rpc: z.string().regex(/^[a-z]+\.[A-Z][A-Za-z0-9]*$/),
  request: z.record(z.string(), z.unknown()),
  mode: z.enum(['preview', 'execute']).default('preview'),
  planId: z.uuid().optional(),
  confirm: z.string().optional(),
});
export type InvokeRequest = z.input<typeof InvokeRequestSchema>;

export const UnlockableSchema = z.object({
  subjectType: SubjectTypeSchema,
  subjectId: z.string().nullable(),
});
export type Unlockable = z.infer<typeof UnlockableSchema>;

const InvokeCommonSchema = z.object({
  rpc: z.string(),
  env: OpsEnvSchema,
  // Dotted paths of masked values, e.g. 'user.email', 'users[0].phoneNumber'.
  hidden: z.array(z.string()),
  // Present when hidden is non-empty: the unlock that would reveal them.
  unlockable: UnlockableSchema.nullable(),
  // Unlock that revealed fields on this response, if any.
  revealedBy: z.uuid().nullable(),
  durationMs: z.number().nonnegative(),
});

export const InvokeResultSchema = InvokeCommonSchema.extend({
  kind: z.literal('result'),
  response: z.unknown(), // ts-proto toJSON output, masked
});
export type InvokeResult = z.infer<typeof InvokeResultSchema>;

export const InvokePlanSchema = InvokeCommonSchema.extend({
  kind: z.literal('plan'),
  planId: z.uuid(),
  expiresAt: z.iso.datetime(),
  dryRun: DryRunModeSchema,
  request: z.unknown(), // normalised request (fromJSON → toJSON), masked
  // Would-be response from the rolled-back / native dry run; null for preview-only.
  response: z.unknown().nullable(),
  // Human-readable caveats ("Sends email — can't be simulated").
  warnings: z.array(z.string()),
});
export type InvokePlan = z.infer<typeof InvokePlanSchema>;

export const InvokeResponseSchema = z.discriminatedUnion('kind', [
  InvokeResultSchema,
  InvokePlanSchema,
]);
export type InvokeResponse = z.infer<typeof InvokeResponseSchema>;

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

// GET /v1/history?limit=N (default 20, max 100) → HistoryResponse
export const HistoryEntrySchema = z.object({
  at: z.iso.datetime(),
  rpc: z.string(),
  kind: z.enum(['read', 'write']),
  mode: z.enum(['run', 'preview', 'execute']),
  outcome: z.enum(['ok', 'error']),
  errorCode: OpsErrorCodeSchema.nullable(),
  // Fields revealed under an unlock (names, never values).
  revealedFields: z.array(z.string()),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export const HistoryResponseSchema = z.object({ entries: z.array(HistoryEntrySchema) });
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
