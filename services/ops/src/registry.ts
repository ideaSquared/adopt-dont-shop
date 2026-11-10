import {
  ADMIN_AUDIT_LOGS,
  ADMIN_SECURITY_MANAGE,
  ADMIN_SECURITY_READ,
  ADMIN_USERS_DEACTIVATE,
  ADMIN_USERS_READ,
  ADMIN_USERS_REACTIVATE,
  ADMIN_USERS_SEARCH,
  ADMIN_USERS_UPDATE,
  APPLICATIONS_APPROVE,
  APPLICATIONS_CREATE,
  APPLICATIONS_PROCESS,
  APPLICATIONS_REJECT,
  APPLICATIONS_UPDATE,
  APPLICATIONS_VIEW,
  EMAIL_TEMPLATES_READ,
  MODERATION_REPORTS_VIEW,
  NOTIFICATIONS_BROADCAST,
  PETS_CREATE,
  PETS_DELETE,
  PETS_MANAGE_ANY,
  PETS_VIEW,
  RESCUE_SETTINGS_VIEW,
  type Permission,
} from '@adopt-dont-shop/lib.types';
import type { DryRunMode, OpsEnv, SubjectType } from '@adopt-dont-shop/ops-contract';

import {
  createDemoApplication,
  deleteDemoApplication,
  validateCreateApplicationRequest,
  validateDeleteApplicationRequest,
} from './demo-application.js';
import {
  createDemoRescue,
  deleteDemoRescue,
  validateCreateRequest,
  validateDeleteRequest,
} from './demo-rescue.js';

// The explicit allow-list of RPCs service.ops will invoke. Keys are
// '<service>.<Method>' where <service> is the proto package segment
// (adopt_dont_shop.<service>.v1). Anything not listed is NOT_ENABLED.
//
// Every entry was checked against the handler it targets (the `requirePermission`
// / `hasPermission` call in services/<svc>/src/grpc/*handlers.ts). service.ops
// mints a principal with NO roles and exactly `permissions` (plus a rescueId from
// `scope`), so a permission missing here surfaces as a downstream PERMISSION_DENIED
// rather than silently succeeding via a role.

export type JsonObject = Readonly<Record<string, unknown>>;

export type Subject = { subjectType: SubjectType; subjectId: string };

type BaseEntry = {
  permissions: readonly Permission[];
  summary: string;
  // Rescue scope to mint into the principal, taken from the normalised request.
  scope?: (req: JsonObject) => { rescueId?: string };
  // Which subject an unlock must cover to reveal this RPC's PII. Null/absent:
  // only an 'any' unlock applies.
  subject?: (req: JsonObject) => Subject | null;
  // jsonNames of request fields that make the call a PII lookup.
  piiRequestFields?: readonly string[];
  // Environments the command may run in. Absent: every environment.
  envs?: readonly OpsEnv[];
  // Extra request checks run before anything is planned or called.
  validate?: (req: JsonObject) => void;
};

// One downstream call made by an in-process command, with exactly the
// permissions (and rescue scope) that handler checks.
// `actingUserId` makes the principal that user instead of the operator, for
// handlers that insist the caller owns the data (an adopter's own draft).
// service.ops refuses it unless that user is a generated demo adopter.
export type DownstreamStep = {
  permissions: readonly Permission[];
  rescueId?: string;
  actingUserId?: string;
};
export type CallDownstream = (
  rpc: string,
  request: JsonObject,
  step: DownstreamStep
) => Promise<JsonObject>;

type WriteEntry = BaseEntry & {
  kind: 'write';
  dryRun: DryRunMode;
  warnings?: readonly string[];
  // Handled in service.ops by chaining other RPCs, instead of one gRPC call.
  // `permissions` then lists the union the steps use, for the catalog.
  local?: (req: JsonObject, call: CallDownstream) => Promise<JsonObject>;
  // Top-level response fields shown in the execute result despite their
  // sensitivity. Only for values this command generated (never stored data).
  revealOnExecute?: readonly string[];
};

export type RegistryEntry = (BaseEntry & { kind: 'read' }) | WriteEntry;

const str = (req: JsonObject, key: string): string | undefined => {
  const value = req[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const rescueFrom =
  (key: string) =>
  (req: JsonObject): { rescueId?: string } => {
    const rescueId = str(req, key);
    return rescueId === undefined ? {} : { rescueId };
  };

const subjectFrom =
  (subjectType: SubjectType, key: string) =>
  (req: JsonObject): Subject | null => {
    const subjectId = str(req, key);
    return subjectId === undefined ? null : { subjectType, subjectId };
  };

export const REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  // ---- reads ------------------------------------------------------------

  'pets.Get': {
    kind: 'read',
    permissions: [PETS_VIEW],
    summary: 'Fetch one pet by id (public projection: no internal notes).',
  },
  'pets.List': {
    kind: 'read',
    permissions: [PETS_VIEW],
    // Pins the read to one rescue and, for that rescue, returns every status.
    scope: rescueFrom('rescueIdFilter'),
    summary: 'List pets; set rescueIdFilter to see every status for one rescue.',
  },
  'pets.GetStats': {
    kind: 'read',
    permissions: [PETS_VIEW],
    // The handler refuses callers without a rescue scope or pets.read:any
    // (which lib.types has no constant for), so rescueIdFilter is required.
    scope: rescueFrom('rescueIdFilter'),
    summary: 'Pet counts by status for one rescue (rescueIdFilter required).',
  },
  'rescue.Get': {
    kind: 'read',
    permissions: [RESCUE_SETTINGS_VIEW],
    subject: subjectFrom('rescue', 'rescueId'),
    summary: 'Fetch one rescue in any status.',
  },
  'applications.List': {
    kind: 'read',
    permissions: [APPLICATIONS_VIEW],
    // Without a rescue scope the handler returns only the caller's own
    // applications (none, for an operator), so rescueIdFilter is required.
    scope: rescueFrom('rescueIdFilter'),
    subject: subjectFrom('rescue', 'rescueIdFilter'),
    summary: 'List non-draft applications for one rescue (rescueIdFilter required).',
  },
  'auth.AdminGetUser': {
    kind: 'read',
    permissions: [ADMIN_USERS_READ],
    subject: subjectFrom('user', 'userId'),
    summary: 'Fetch one user account by id.',
  },
  'auth.SearchUsers': {
    kind: 'read',
    permissions: [ADMIN_USERS_SEARCH],
    // `search` matches name and email, so using it is a PII lookup.
    piiRequestFields: ['search'],
    summary: 'Search user accounts by status, role, date or free text.',
  },
  'auth.AdminListSessions': {
    kind: 'read',
    permissions: [ADMIN_SECURITY_READ],
    subject: subjectFrom('user', 'userId'),
    summary: 'List active login sessions, optionally for one user.',
  },
  'audit.Query': {
    kind: 'read',
    permissions: [ADMIN_AUDIT_LOGS],
    summary: 'Query the audit trail.',
  },
  'audit.GetByTarget': {
    kind: 'read',
    permissions: [ADMIN_AUDIT_LOGS],
    summary: 'Audit events for one aggregate (aggregateType + aggregateId).',
  },
  'moderation.GetReport': {
    kind: 'read',
    permissions: [MODERATION_REPORTS_VIEW],
    summary: 'Fetch one moderation report with its internal workflow.',
  },
  'moderation.ListReports': {
    kind: 'read',
    permissions: [MODERATION_REPORTS_VIEW],
    summary: 'List moderation reports.',
  },
  'notifications.ListEmailTemplates': {
    kind: 'read',
    permissions: [EMAIL_TEMPLATES_READ],
    summary: 'List email templates.',
  },

  // ---- writes -----------------------------------------------------------

  'pets.UpdateStatus': {
    kind: 'write',
    // pets.manage:any makes the handler skip the rescue-membership check, which
    // would otherwise call service.rescue (isPermittedRescueMutation).
    permissions: [PETS_MANAGE_ANY],
    // rollback: the handler only writes pets.pets + pets.pet_status_transitions and
    // stages pets.statusChanged in the outbox, all inside withTransaction. With
    // pets.manage:any it makes no outbound call. Nothing escapes a rolled-back
    // transaction, and the dry run exercises the real status-machine checks.
    dryRun: 'rollback',
    summary: 'Move a pet to a new status (validated against the status machine).',
    warnings: ['Publishes pets.statusChanged on execute; the preview suppresses events.'],
  },
  'auth.DeactivateUser': {
    kind: 'write',
    permissions: [ADMIN_USERS_DEACTIVATE],
    // rollback: setStatus only updates auth.users and stages auth.userDeactivated +
    // auth.actionTaken in the outbox inside withTransaction. No Redis, email or
    // session revocation happens in this handler, so a rolled-back run is faithful.
    dryRun: 'rollback',
    summary: 'Deactivate a user account. Refuses admin/moderator targets and self.',
    warnings: [
      'Deactivated users cannot log in. Existing refresh tokens are not revoked by this call.',
    ],
  },
  'auth.ReactivateUser': {
    kind: 'write',
    permissions: [ADMIN_USERS_REACTIVATE],
    // rollback: same shape as DeactivateUser: one auth.users UPDATE plus outbox
    // events inside withTransaction; no external side effects.
    dryRun: 'rollback',
    summary: 'Reactivate a deactivated user account.',
  },
  'notifications.Broadcast': {
    kind: 'write',
    permissions: [NOTIFICATIONS_BROADCAST],
    // native: the request has its own dryRun flag. With it set the handler only asks
    // service.auth for the cohort size and returns { targeted } without inserting a
    // single notification: cheaper than a rolled-back O(cohort) fan-out, and it is
    // the handler's own documented preview contract.
    dryRun: 'native',
    summary: 'Send an in-app announcement to a user cohort.',
    warnings: ['Execute delivers to every user in the cohort and cannot be recalled.'],
  },

  // ---- in-process commands (dev and staging only) -----------------------

  'demo.CreateRescue': {
    kind: 'write',
    permissions: [ADMIN_USERS_UPDATE, ADMIN_SECURITY_MANAGE, PETS_CREATE, PETS_MANAGE_ANY],
    // preview-only: it chains writes across auth, rescue and pets, which no
    // single transaction can roll back. The preview shows the plan only.
    dryRun: 'preview-only',
    envs: ['dev', 'staging'],
    validate: validateCreateRequest,
    local: createDemoRescue,
    // A fresh example.com address and password generated by this call: the
    // tester needs both to sign in, and neither is a real person's data.
    revealOnExecute: ['ownerEmail', 'ownerPassword'],
    summary: 'Create a verified demo rescue, an active owner login and sample pets.',
    warnings: [
      'Creates real rows in auth, rescue and pets. Remove them with `pnpm ops demo delete-rescue <rescueId>`.',
      'The owner password is shown once, in the result. It is not stored by service.ops.',
    ],
  },
  'demo.DeleteRescue': {
    kind: 'write',
    permissions: [
      RESCUE_SETTINGS_VIEW,
      ADMIN_SECURITY_MANAGE,
      ADMIN_USERS_READ,
      PETS_VIEW,
      PETS_DELETE,
      PETS_MANAGE_ANY,
      ADMIN_USERS_DEACTIVATE,
    ],
    dryRun: 'preview-only',
    envs: ['dev', 'staging'],
    validate: validateDeleteRequest,
    local: deleteDemoRescue,
    summary: 'Remove a demo rescue: its pets, the rescue, and its demo owner login.',
    warnings: ['Refuses rescues not made by `demo create-rescue`.'],
  },
  'demo.CreateApplication': {
    kind: 'write',
    permissions: [
      PETS_VIEW,
      APPLICATIONS_VIEW,
      ADMIN_USERS_SEARCH,
      ADMIN_USERS_UPDATE,
      ADMIN_USERS_READ,
      APPLICATIONS_CREATE,
      APPLICATIONS_UPDATE,
      APPLICATIONS_PROCESS,
      APPLICATIONS_APPROVE,
      APPLICATIONS_REJECT,
    ],
    // preview-only: it chains writes across auth and applications, which no
    // single transaction can roll back. The preview shows the plan only.
    dryRun: 'preview-only',
    envs: ['dev', 'staging'],
    validate: validateCreateApplicationRequest,
    local: createDemoApplication,
    // A fresh example.com address and password generated by this call, so the
    // tester can also sign in as the adopter.
    revealOnExecute: ['adopterEmail', 'adopterPassword'],
    summary: 'Create a demo adopter and a submitted application, optionally at a later stage.',
    warnings: [
      'Creates real rows in auth and applications for a pet of the rescue you name, and moves it through review if you pass a stage.',
      'The adopter password is shown once, in the result. It is not stored by service.ops.',
    ],
  },
  'demo.DeleteApplication': {
    kind: 'write',
    permissions: [APPLICATIONS_VIEW, ADMIN_USERS_READ, APPLICATIONS_UPDATE, ADMIN_USERS_DEACTIVATE],
    dryRun: 'preview-only',
    envs: ['dev', 'staging'],
    validate: validateDeleteApplicationRequest,
    local: deleteDemoApplication,
    summary: 'Withdraw a demo application and deactivate its demo adopter login.',
    warnings: ['Refuses applications not made by `demo create-application`.'],
  },
};

export const getRegistryEntry = (rpc: string): RegistryEntry | undefined =>
  Object.hasOwn(REGISTRY, rpc) ? REGISTRY[rpc] : undefined;

export const splitRpc = (rpc: string): { service: string; method: string } => {
  const [service, method] = rpc.split('.');
  return { service, method };
};

// 'UpdateStatus' -> 'update-status'
export const commandName = (method: string): string =>
  method.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
