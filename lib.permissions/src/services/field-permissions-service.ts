import { ApiService } from '@adopt-dont-shop/lib.api';
import type { PermissionsServiceConfig, UserRole } from '../types';
import type {
  FieldAccessLevel,
  FieldAccessMap,
  FieldPermissionCheckResult,
  FieldPermissionRecord,
  FieldPermissionResource,
  FieldPermissionUpdateRequest,
  FieldMaskingOptions,
} from '../types/field-permissions';
import { getDefaultFieldAccess, getFieldAccessMap } from '../config/field-permission-defaults';

/**
 * FieldPermissionsService - Handles field-level access control
 *
 * Provides methods to check, resolve, and manage field-level permissions.
 * Uses a two-layer approach: default configurations with database overrides.
 * Includes a short-lived cache to minimise repeated API calls.
 */
export class FieldPermissionsService {
  private config: PermissionsServiceConfig;
  private apiService: ApiService;
  private overrideCache = new Map<
    string,
    { overrides: FieldPermissionRecord[]; expires: number }
  >();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes

  constructor(config: Partial<PermissionsServiceConfig> = {}, apiService?: ApiService) {
    this.config = {
      debug: false,
      ...config,
    };
    this.apiService = apiService || new ApiService();
  }

  /**
   * Resolve the effective access level for a specific field.
   * Database overrides take precedence over defaults.
   */
  public async getFieldAccess(
    resource: FieldPermissionResource,
    role: UserRole,
    fieldName: string
  ): Promise<FieldPermissionCheckResult> {
    const overrides = await this.getOverrides(resource, role);
    const override = overrides.find((o) => o.fieldName === fieldName);

    if (override) {
      return {
        allowed: override.accessLevel !== 'none',
        effectiveLevel: override.accessLevel,
        source: 'override',
      };
    }

    const defaultLevel = getDefaultFieldAccess(resource, role, fieldName);
    return {
      allowed: defaultLevel !== 'none',
      effectiveLevel: defaultLevel,
      source: 'default',
    };
  }

  /**
   * Get the complete field access map for a role on a resource,
   * with database overrides applied on top of defaults.
   */
  public async getEffectiveFieldAccessMap(
    resource: FieldPermissionResource,
    role: UserRole
  ): Promise<FieldAccessMap> {
    const defaults = getFieldAccessMap(resource, role);
    const overrides = await this.getOverrides(resource, role);

    const effective = { ...defaults };
    for (const override of overrides) {
      effective[override.fieldName] = override.accessLevel;
    }

    return effective;
  }

  /**
   * Check if a specific field access level is permitted.
   */
  public async checkFieldAccess(
    resource: FieldPermissionResource,
    role: UserRole,
    fieldName: string,
    requiredLevel: FieldAccessLevel
  ): Promise<boolean> {
    const result = await this.getFieldAccess(resource, role, fieldName);

    if (requiredLevel === 'none') {
      return true;
    }
    if (requiredLevel === 'read') {
      return result.effectiveLevel === 'read' || result.effectiveLevel === 'write';
    }
    if (requiredLevel === 'write') {
      return result.effectiveLevel === 'write';
    }

    return false;
  }

  /**
   * Filter an object to only include fields the role can read.
   * Returns a new object with restricted fields removed.
   */
  public async maskFields<T extends Record<string, unknown>>(
    data: T,
    options: FieldMaskingOptions
  ): Promise<Partial<T>> {
    const accessMap = await this.getEffectiveFieldAccessMap(options.resource, options.role);
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const level = accessMap[key];
      // If field is not in the access map, default to 'none' (hide unknown fields)
      if (level === undefined) {
        continue;
      }
      if (options.action === 'read' && (level === 'read' || level === 'write')) {
        masked[key] = value;
      } else if (options.action === 'write' && level === 'write') {
        masked[key] = value;
      }
    }

    return masked as Partial<T>;
  }

  /**
   * Filter an array of objects to only include readable fields.
   */
  public async maskFieldsArray<T extends Record<string, unknown>>(
    data: ReadonlyArray<T>,
    options: FieldMaskingOptions
  ): Promise<Array<Partial<T>>> {
    const accessMap = await this.getEffectiveFieldAccessMap(options.resource, options.role);
    return data.map((item) => {
      const masked: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) {
        const level = accessMap[key];
        if (level === undefined) {
          continue;
        }
        if (options.action === 'read' && (level === 'read' || level === 'write')) {
          masked[key] = value;
        } else if (options.action === 'write' && level === 'write') {
          masked[key] = value;
        }
      }
      return masked as Partial<T>;
    });
  }

  /**
   * Get the list of fields that are not writable for a role on a resource.
   * Used to validate write requests.
   */
  public async getWriteBlockedFields(
    resource: FieldPermissionResource,
    role: UserRole,
    requestedFields: ReadonlyArray<string>
  ): Promise<string[]> {
    const accessMap = await this.getEffectiveFieldAccessMap(resource, role);
    return requestedFields.filter((field) => {
      const level = accessMap[field];
      return level !== 'write';
    });
  }

  /**
   * Update a field permission override (admin only).
   */
  public async updateFieldPermission(request: FieldPermissionUpdateRequest): Promise<boolean> {
    try {
      await this.apiService.post('/api/v1/field-permissions', request);
      this.clearCache(request.resource, request.role);

      if (this.config.debug) {
        console.log(
          `Updated field permission: ${request.resource}.${request.fieldName} = ${request.accessLevel} for ${request.role}`
        );
      }
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update field permission:', error);
      }
      throw error;
    }
  }

  /**
   * Delete a field permission override, reverting to the default.
   */
  public async deleteFieldPermission(
    resource: FieldPermissionResource,
    role: UserRole,
    fieldName: string
  ): Promise<boolean> {
    try {
      await this.apiService.delete(
        `/api/v1/field-permissions/${resource}/${role}/${fieldName}`
      );
      this.clearCache(resource, role);
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to delete field permission:', error);
      }
      throw error;
    }
  }

  /**
   * Get all field permission overrides for a resource.
   */
  public async getFieldPermissions(
    resource: FieldPermissionResource
  ): Promise<FieldPermissionRecord[]> {
    try {
      const response = (await this.apiService.get(
        `/api/v1/field-permissions/${resource}`
      )) as { data: FieldPermissionRecord[] };
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get field permissions:', error);
      }
      return [];
    }
  }

  /**
   * Clear cache for specific resource/role or all.
   */
  public clearCache(resource?: FieldPermissionResource, role?: UserRole): void {
    if (resource && role) {
      this.overrideCache.delete(`${resource}:${role}`);
    } else {
      this.overrideCache.clear();
    }
  }

  /**
   * Fetch overrides from API with caching.
   */
  private async getOverrides(
    resource: FieldPermissionResource,
    role: UserRole
  ): Promise<FieldPermissionRecord[]> {
    const cacheKey = `${resource}:${role}`;
    const cached = this.overrideCache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return cached.overrides;
    }

    try {
      const response = (await this.apiService.get(
        `/api/v1/field-permissions/${resource}/${role}`
      )) as { data: FieldPermissionRecord[] };

      const overrides = response.data || [];
      this.overrideCache.set(cacheKey, {
        overrides,
        expires: Date.now() + this.cacheTimeout,
      });

      return overrides;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to fetch field permission overrides for ${cacheKey}:`, error);
      }
      // Return empty on error - defaults will be used
      return [];
    }
  }
}
