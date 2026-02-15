// Main exports for @adopt-dont-shop/lib.permissions
export { PermissionsService } from './services/permissions-service';
export type { PermissionsServiceConfig } from './types';
export * from './types';

// Export rescue-specific permissions
export * from './types/rescue-permissions';

// Export field-level permission types and services
export * from './types/field-permissions';
export { FieldPermissionsService } from './services/field-permissions-service';
export {
  defaultFieldPermissions,
  getDefaultFieldAccess,
  getFieldAccessMap,
} from './config/field-permission-defaults';
