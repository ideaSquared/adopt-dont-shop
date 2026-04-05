// Re-export default field permission configurations from the shared types package.
// lib.types is the source of truth; lib.permissions re-exports for
// backwards compatibility so existing frontend consumers don't break.
export {
  defaultFieldPermissions,
  getDefaultFieldAccess,
  getFieldAccessMap,
} from '@adopt-dont-shop/lib.types';
