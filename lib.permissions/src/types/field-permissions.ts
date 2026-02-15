// Re-export all field-level permission types from the shared types package.
// lib.types is the source of truth; lib.permissions re-exports for
// backwards compatibility so existing frontend consumers don't break.
export type {
  FieldAccessLevel,
  FieldPermissionResource,
  FieldPermissionRule,
  FieldPermissionRecord,
  FieldAccessMap,
  ResourceFieldPermissions,
  FieldPermissionConfig,
  FieldPermissionCheckRequest,
  FieldPermissionCheckResult,
  FieldPermissionUpdateRequest,
  FieldAccessAuditEntry,
  FieldMaskingOptions,
} from '@adopt-dont-shop/lib.types';
