// Core RBAC types
export * from './types/index.js';

// Rescue-specific permission constants
export * from './types/rescue-permissions.js';

// Field-level permission types
export * from './types/field-permissions.js';

// Plan tier types and limits
export * from './types/plans.js';

// Field permission default configurations
export {
  defaultFieldPermissions,
  getDefaultFieldAccess,
  getFieldAccessMap,
  SENSITIVE_FIELD_DENYLIST,
  isSensitiveField,
  enforceSensitiveDenylist,
} from './config/field-permission-defaults.js';

// Shared display labels for status enums
export * from './status-labels.js';

// Notification enums and helpers (cross-cutting across all apps)
export * from './types/notifications.js';

// Domain status types (canonical value sets for all entities)
export * from './types/domain-status.js';

// Common utility types (sort, date range, service config)
export * from './types/common.js';

// Generic entity activity (admin EntityInspector — works across all entity types)
export * from './types/entity-activity.js';

// User activity (admin user detail panel — activity log + summary; aliases to entity-activity)
export * from './types/user-activity.js';
