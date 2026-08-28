// gRPC handlers for field-level permission management:
// GetFieldPermissionDefaults, GetFieldPermissionDefaultsForRole,
// ListFieldPermissionOverrides, ListFieldPermissionOverridesForRole,
// UpsertFieldPermission, BulkUpsertFieldPermissions, DeleteFieldPermission.
//
// Direct port of the monolith's field-permissions service + routes.
// Two stable invariants:
//   1. The lib.types `defaultFieldPermissions` config is the source of
//      truth for the access map. The DB only stores OVERRIDES on top.
//   2. The SENSITIVE_FIELD_DENYLIST (password, tokens, 2FA secrets, ...)
//      can never be loosened — both writes that name a sensitive field
//      are rejected here AND the resolver in the gateway/library enforces
//      it after merging defaults+overrides.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type TransactionalScope } from '@adopt-dont-shop/events';
import {
  ADMIN_FIELD_PERMISSIONS_READ as FIELD_PERMISSIONS_READ,
  ADMIN_FIELD_PERMISSIONS_WRITE as FIELD_PERMISSIONS_WRITE,
  defaultFieldPermissions,
  getFieldAccessMap,
  isSensitiveField,
  type FieldPermissionConfig,
  type UserRole,
} from '@adopt-dont-shop/lib.types';
import {
  AuthV1,
  type AuthFieldPermission,
  type BulkUpsertFieldPermissionsRequest,
  type BulkUpsertFieldPermissionsResponse,
  type DeleteFieldPermissionRequest,
  type DeleteFieldPermissionResponse,
  type FieldPermissionOverrideInput,
  type GetFieldPermissionDefaultsRequest,
  type GetFieldPermissionDefaultsResponse,
  type GetFieldPermissionDefaultsForRoleRequest,
  type GetFieldPermissionDefaultsForRoleResponse,
  type ListFieldPermissionOverridesForRoleRequest,
  type ListFieldPermissionOverridesForRoleResponse,
  type ListFieldPermissionOverridesRequest,
  type ListFieldPermissionOverridesResponse,
  type UpsertFieldPermissionRequest,
  type UpsertFieldPermissionResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

// --- Enum maps -------------------------------------------------------

type ResourceDb = keyof FieldPermissionConfig; // 'users' | 'pets' | 'applications' | 'rescues'
type AccessLevelDb = 'none' | 'read' | 'write';

const VALID_ROLES = new Set<UserRole>([
  'admin',
  'moderator',
  'rescue_staff',
  'adopter',
  'super_admin',
  'support_agent',
]);

function resourceFromProto(r: AuthV1.FieldPermissionResource): ResourceDb {
  switch (r) {
    case AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS:
      return 'users';
    case AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_PETS:
      return 'pets';
    case AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_APPLICATIONS:
      return 'applications';
    case AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_RESCUES:
      return 'rescues';
    default:
      throw new HandlerError('INVALID_ARGUMENT', `invalid resource: ${r}`);
  }
}

function resourceToProto(r: ResourceDb): AuthV1.FieldPermissionResource {
  switch (r) {
    case 'users':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS;
    case 'pets':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_PETS;
    case 'applications':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_APPLICATIONS;
    case 'rescues':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_RESCUES;
  }
}

function accessLevelFromProto(l: AuthV1.FieldAccessLevel): AccessLevelDb {
  switch (l) {
    case AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_NONE:
      return 'none';
    case AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ:
      return 'read';
    case AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE:
      return 'write';
    default:
      throw new HandlerError('INVALID_ARGUMENT', `invalid access_level: ${l}`);
  }
}

function accessLevelToProto(l: AccessLevelDb): AuthV1.FieldAccessLevel {
  switch (l) {
    case 'none':
      return AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_NONE;
    case 'read':
      return AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ;
    case 'write':
      return AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE;
  }
}

function validateRole(role: string): UserRole {
  if (!VALID_ROLES.has(role as UserRole)) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `role must be one of: ${[...VALID_ROLES].join(', ')}`
    );
  }
  return role as UserRole;
}

// Confirm a field name actually exists in the lib.types default map for
// that resource. The admin UI should never need to override an unknown
// field; rejecting here gives a clearer error than silently storing a
// stranded row.
function validateFieldName(resource: ResourceDb, fieldName: string): void {
  // Use admin's access map as the universe of known fields (admin sees the
  // most). Any field present in any role's defaults appears here.
  const knownFields = new Set(Object.keys(getFieldAccessMap(resource, 'admin')));
  if (!knownFields.has(fieldName)) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `unknown field "${fieldName}" for resource "${resource}"`
    );
  }
}

// --- Row type --------------------------------------------------------

type FieldPermissionRow = {
  field_permission_id: number;
  resource: ResourceDb;
  field_name: string;
  role: string;
  access_level: AccessLevelDb;
  created_at: Date;
  updated_at: Date;
};

function rowToProto(row: FieldPermissionRow): AuthFieldPermission {
  return {
    fieldPermissionId: row.field_permission_id,
    resource: resourceToProto(row.resource),
    fieldName: row.field_name,
    role: row.role,
    accessLevel: accessLevelToProto(row.access_level),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const ROW_COLUMNS = `field_permission_id, resource, field_name, role, access_level,
  created_at, updated_at`;

// --- GetFieldPermissionDefaults --------------------------------------

export async function getFieldPermissionDefaults(
  _deps: HandlerDeps,
  principal: Principal,
  _req: GetFieldPermissionDefaultsRequest
): Promise<GetFieldPermissionDefaultsResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_READ}' required`);
  }
  return { defaultsJson: JSON.stringify(defaultFieldPermissions) };
}

// --- GetFieldPermissionDefaultsForRole -------------------------------

export async function getFieldPermissionDefaultsForRole(
  _deps: HandlerDeps,
  principal: Principal,
  req: GetFieldPermissionDefaultsForRoleRequest
): Promise<GetFieldPermissionDefaultsForRoleResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_READ}' required`);
  }
  const resource = resourceFromProto(req.resource);
  const role = validateRole(req.role);
  const map = getFieldAccessMap(resource, role);
  return { accessMapJson: JSON.stringify(map) };
}

// --- ListFieldPermissionOverrides ------------------------------------

export async function listFieldPermissionOverrides(
  deps: HandlerDeps,
  principal: Principal,
  req: ListFieldPermissionOverridesRequest
): Promise<ListFieldPermissionOverridesResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_READ}' required`);
  }
  const resource = resourceFromProto(req.resource);
  const result = await deps.pool.query<FieldPermissionRow>(
    `SELECT ${ROW_COLUMNS} FROM field_permissions
       WHERE resource = $1 AND deleted_at IS NULL
       ORDER BY field_name ASC, role ASC`,
    [resource]
  );
  return { overrides: result.rows.map(rowToProto) };
}

// --- ListFieldPermissionOverridesForRole -----------------------------

export async function listFieldPermissionOverridesForRole(
  deps: HandlerDeps,
  principal: Principal,
  req: ListFieldPermissionOverridesForRoleRequest
): Promise<ListFieldPermissionOverridesForRoleResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_READ}' required`);
  }
  const resource = resourceFromProto(req.resource);
  const role = validateRole(req.role);
  const result = await deps.pool.query<FieldPermissionRow>(
    `SELECT ${ROW_COLUMNS} FROM field_permissions
       WHERE resource = $1 AND role = $2 AND deleted_at IS NULL
       ORDER BY field_name ASC`,
    [resource, role]
  );
  return { overrides: result.rows.map(rowToProto) };
}

// --- Internal helpers ------------------------------------------------

// Block the sensitive denylist (password, tokens, 2FA secrets, ...) up
// front. Each batch is fully rejected if any one entry names a sensitive
// field — matches the monolith's bulk-rejection behaviour so the admin
// gets a clear "did not write any rows" signal instead of a partial.
function rejectSensitive(
  inputs: ReadonlyArray<{ resource: ResourceDb; fieldName: string }>
): string[] {
  const blocked: string[] = [];
  for (const i of inputs) {
    if (isSensitiveField(i.resource, i.fieldName)) {
      blocked.push(`${i.resource}.${i.fieldName}`);
    }
  }
  return blocked;
}

// Single upsert. The (resource, field_name, role) tuple has a unique
// index — ON CONFLICT handles the race where two admins click "save"
// concurrently AND the case where an override was previously soft-deleted
// (we clear deleted_at so the row resurrects rather than colliding).
async function upsertOne(
  resource: ResourceDb,
  fieldName: string,
  role: string,
  accessLevel: AccessLevelDb,
  client: { query: (sql: string, params: unknown[]) => Promise<{ rows: FieldPermissionRow[] }> }
): Promise<FieldPermissionRow> {
  const result = await client.query(
    `INSERT INTO field_permissions (resource, field_name, role, access_level)
       VALUES ($1, $2, $3, $4)
     ON CONFLICT (resource, field_name, role)
       DO UPDATE SET access_level = EXCLUDED.access_level,
                     updated_at = now(),
                     deleted_at = NULL
     RETURNING ${ROW_COLUMNS}`,
    [resource, fieldName, role, accessLevel]
  );
  const row = result.rows[0];
  if (row === undefined) {
    throw new HandlerError('INTERNAL', 'upsert returned no row');
  }
  return row;
}

// Forensic record of a field-permission change, published as `auth.actionTaken`
// so service.audit's wildcard `*.actionTaken` subscriber persists it (the
// field-permission half of ADS-1246, tracked as ADS-1262). Queued inside the
// committing transaction — publish-after-commit — and only on the write that
// actually changed state, never on a rejected write or a no-op delete. The
// {resource, fieldName, role, accessLevel} deltas are config metadata, not
// sensitive user data, so it is safe to carry them in the event body.
function publishFieldPermissionActionTaken(
  publish: TransactionalScope['publish'],
  params: {
    actorUserId: string;
    action: 'upsert' | 'bulkUpsert' | 'delete';
    aggregateId: string;
    details: unknown;
  }
): void {
  publish({
    type: 'auth.actionTaken',
    id: `auth.actionTaken.${randomUUID()}`,
    payload: {
      eventId: randomUUID(),
      service: 'service.auth',
      subject: 'auth.actionTaken',
      aggregateType: 'fieldPermission',
      aggregateId: params.aggregateId,
      actorUserId: params.actorUserId,
      action: `fieldPermission.${params.action}`,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: params.details,
    },
  });
}

// --- UpsertFieldPermission -------------------------------------------

export async function upsertFieldPermission(
  deps: HandlerDeps,
  principal: Principal,
  req: UpsertFieldPermissionRequest
): Promise<UpsertFieldPermissionResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_WRITE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_WRITE}' required`);
  }
  const resource = resourceFromProto(req.resource);
  const role = validateRole(req.role);
  const accessLevel = accessLevelFromProto(req.accessLevel);
  const fieldName = req.fieldName?.trim() ?? '';
  if (fieldName === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'field_name is required');
  }
  validateFieldName(resource, fieldName);

  const blocked = rejectSensitive([{ resource, fieldName }]);
  if (blocked.length > 0) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `cannot override sensitive fields: ${blocked.join(', ')}`
    );
  }

  const row = await withTransaction(deps, async ({ client, publish }) => {
    const inserted = await upsertOne(resource, fieldName, role, accessLevel, client);
    publishFieldPermissionActionTaken(publish, {
      actorUserId: principal.userId,
      action: 'upsert',
      aggregateId: String(inserted.field_permission_id),
      details: { resource, fieldName, role, accessLevel },
    });
    return inserted;
  });
  return { override: rowToProto(row) };
}

// --- BulkUpsertFieldPermissions --------------------------------------

export async function bulkUpsertFieldPermissions(
  deps: HandlerDeps,
  principal: Principal,
  req: BulkUpsertFieldPermissionsRequest
): Promise<BulkUpsertFieldPermissionsResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_WRITE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_WRITE}' required`);
  }
  if (req.overrides.length === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'overrides must be non-empty');
  }

  type Normalised = {
    resource: ResourceDb;
    fieldName: string;
    role: string;
    accessLevel: AccessLevelDb;
  };
  const inputs: Normalised[] = req.overrides.map((o: FieldPermissionOverrideInput) => {
    const resource = resourceFromProto(o.resource);
    const role = validateRole(o.role);
    const accessLevel = accessLevelFromProto(o.accessLevel);
    const fieldName = o.fieldName?.trim() ?? '';
    if (fieldName === '') {
      throw new HandlerError('INVALID_ARGUMENT', 'field_name is required');
    }
    validateFieldName(resource, fieldName);
    return { resource, fieldName, role, accessLevel };
  });

  const blocked = rejectSensitive(inputs);
  if (blocked.length > 0) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `cannot override sensitive fields: ${blocked.join(', ')}`
    );
  }

  const rows = await withTransaction(deps, async ({ client, publish }) => {
    const out: FieldPermissionRow[] = [];
    for (const i of inputs) {
      out.push(await upsertOne(i.resource, i.fieldName, i.role, i.accessLevel, client));
    }
    publishFieldPermissionActionTaken(publish, {
      actorUserId: principal.userId,
      action: 'bulkUpsert',
      aggregateId: out.map(r => String(r.field_permission_id)).join(','),
      details: {
        count: inputs.length,
        overrides: inputs.map(i => ({
          resource: i.resource,
          fieldName: i.fieldName,
          role: i.role,
          accessLevel: i.accessLevel,
        })),
      },
    });
    return out;
  });
  return { overrides: rows.map(rowToProto) };
}

// --- DeleteFieldPermission -------------------------------------------

export async function deleteFieldPermission(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteFieldPermissionRequest
): Promise<DeleteFieldPermissionResponse> {
  if (!hasPermission(principal, FIELD_PERMISSIONS_WRITE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${FIELD_PERMISSIONS_WRITE}' required`);
  }
  const resource = resourceFromProto(req.resource);
  const role = validateRole(req.role);
  const fieldName = req.fieldName?.trim() ?? '';
  if (fieldName === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'field_name is required');
  }

  // ADS-1262: route through withTransaction so the soft-delete write and its
  // audit event commit together (publish-after-commit). A no-op delete (already
  // deleted / never existed) changes no state and emits no event.
  const deleted = await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<{
      field_permission_id: number;
      access_level: AccessLevelDb;
    }>(
      `UPDATE field_permissions
          SET deleted_at = now()
        WHERE resource = $1 AND role = $2 AND field_name = $3 AND deleted_at IS NULL
        RETURNING field_permission_id, access_level`,
      [resource, role, fieldName]
    );
    const deletedRow = result.rows[0];
    if (deletedRow === undefined) {
      return false;
    }
    publishFieldPermissionActionTaken(publish, {
      actorUserId: principal.userId,
      action: 'delete',
      aggregateId: String(deletedRow.field_permission_id),
      details: { resource, fieldName, role, before: { accessLevel: deletedRow.access_level } },
    });
    return true;
  });
  return { deleted };
}
