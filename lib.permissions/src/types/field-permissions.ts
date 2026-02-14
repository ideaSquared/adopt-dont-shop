/**
 * Field-level permission types for granular access control.
 *
 * Field permissions extend the existing RBAC system to control
 * which fields on a resource can be read or written by each role.
 */
import type { UserRole } from './index';

/**
 * Access level for a specific field
 * - 'none': Field is completely hidden (not present in response, cannot be written)
 * - 'read': Field is visible in responses but cannot be modified
 * - 'write': Field can be both read and modified
 */
export type FieldAccessLevel = 'none' | 'read' | 'write';

/**
 * Resources that support field-level permissions
 */
export type FieldPermissionResource = 'users' | 'pets' | 'applications' | 'rescues';

/**
 * A single field permission rule mapping a role to an access level for a field on a resource.
 */
export type FieldPermissionRule = {
  resource: FieldPermissionResource;
  fieldName: string;
  role: UserRole;
  accessLevel: FieldAccessLevel;
};

/**
 * Database-persisted field permission record
 */
export type FieldPermissionRecord = FieldPermissionRule & {
  fieldPermissionId: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A map from field name to access level for quick lookup
 */
export type FieldAccessMap = Record<string, FieldAccessLevel>;

/**
 * Configuration for field permissions on a specific resource, keyed by role
 */
export type ResourceFieldPermissions = Record<UserRole, FieldAccessMap>;

/**
 * Complete field permission configuration for all resources
 */
export type FieldPermissionConfig = Record<FieldPermissionResource, ResourceFieldPermissions>;

/**
 * Request to check field-level access
 */
export type FieldPermissionCheckRequest = {
  userId: string;
  role: UserRole;
  resource: FieldPermissionResource;
  fieldName: string;
  accessLevel: FieldAccessLevel;
};

/**
 * Result of a field permission check
 */
export type FieldPermissionCheckResult = {
  allowed: boolean;
  effectiveLevel: FieldAccessLevel;
  source: 'default' | 'override';
};

/**
 * Request to update a field permission override
 */
export type FieldPermissionUpdateRequest = {
  resource: FieldPermissionResource;
  fieldName: string;
  role: UserRole;
  accessLevel: FieldAccessLevel;
  updatedBy: string;
};

/**
 * Audit log entry for field-level access
 */
export type FieldAccessAuditEntry = {
  userId: string;
  role: UserRole;
  resource: FieldPermissionResource;
  resourceId: string;
  fieldsAccessed: string[];
  fieldsMasked: string[];
  fieldsWriteBlocked: string[];
  action: 'read' | 'write';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Options for applying field masking to a response
 */
export type FieldMaskingOptions = {
  resource: FieldPermissionResource;
  role: UserRole;
  action: 'read' | 'write';
  auditLog?: boolean;
};
