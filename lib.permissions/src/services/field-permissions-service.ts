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

/**
 * Guard that validates the shape returned by the field-permissions API.
 * Both getFieldPermissions() and getOverrides() cast the response to
 * `{ data: FieldPermissionRecord[] }` — this guard checks that shape
 * before the cast so a malformed server response fails loudly rather
 * than silently producing wrong access decisions.
 */
function isFieldPermissionResponse(value: unknown): value is { data: FieldPermissionRecord[] } {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj['data'])) {
    return false;
  }
  return (obj['data'] as unknown[]).every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>)['field_name'] === 'string' &&
      typeof (item as Record<string, unknown>)['access_level'] === 'string'
  );
}
import {
  getDefaultFieldAccess,
  getFieldAccessMap,
  isSensitiveField,
  enforceSensitiveDenylist,
} from '../config/field-permission-defaults';

/**
 * Normalize a value to a plain object if it exposes a toJSON() method
 * (e.g. Sequelize model instances). Calling Object.entries on a raw
 * Sequelize model only yields wrapper properties (dataValues, isNewRecord)
 * rather than the actual field attributes — toJSON() returns the plain shape.
 */
const toPlain = <T extends Record<string, unknown>>(value: T): T => {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).toJSON === 'function'
  ) {
    return (value as unknown as { toJSON: () => T }).toJSON();
  }
  return value;
};

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
  private cacheTimeout = 60 * 1000; // 60 seconds — matches backend CACHE_TTL

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
    if (isSensitiveField(resource, fieldName)) {
      return { allowed: false, effectiveLevel: 'none', source: 'default' };
    }

    let overrides: FieldPermissionRecord[] = [];
    try {
      overrides = await this.getOverrides(resource, role);
    } catch {
      // API unavailable — fall back to defaults rather than failing the check
    }
    const override = overrides.find((o) => o.field_name === fieldName);

    if (override) {
      return {
        allowed: override.access_level !== 'none',
        effectiveLevel: override.access_level,
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
    let overrides: FieldPermissionRecord[] = [];
    try {
      overrides = await this.getOverrides(resource, role);
    } catch {
      // API unavailable — fall back to defaults rather than failing the map build
    }

    const effective = { ...defaults };
    for (const override of overrides) {
      effective[override.field_name] = override.access_level;
    }

    return enforceSensitiveDenylist(resource, effective);
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
    const plain = toPlain(data) as T;
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(plain)) {
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
      const plain = toPlain(item) as T;
      const masked: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(plain)) {
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
      await this.apiService.delete(`/api/v1/field-permissions/${resource}/${role}/${fieldName}`);
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
   *
   * Fails closed: errors are re-thrown so callers (typically admin UIs)
   * see auth failures rather than silently receiving an empty list that
   * looks like "no overrides configured". Validate the response shape
   * before trusting it.
   */
  public async getFieldPermissions(
    resource: FieldPermissionResource
  ): Promise<FieldPermissionRecord[]> {
    const raw = await this.apiService.get(`/api/v1/field-permissions/${resource}`);
    if (!isFieldPermissionResponse(raw)) {
      throw new Error(
        `getFieldPermissions: unexpected response shape from /api/v1/field-permissions/${resource}`
      );
    }
    return raw.data;
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
      const raw = await this.apiService.get(`/api/v1/field-permissions/${resource}/${role}`);

      if (!isFieldPermissionResponse(raw)) {
        throw new Error(
          `getOverrides: unexpected response shape from /api/v1/field-permissions/${resource}/${role}`
        );
      }

      const overrides = raw.data;
      this.overrideCache.set(cacheKey, {
        overrides,
        expires: Date.now() + this.cacheTimeout,
      });

      return overrides;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to fetch field permission overrides for ${cacheKey}:`, error);
      }
      // Re-throw so callers can distinguish a fetch failure from a legitimate empty
      // override list. Callers catch and fall back to defaults; we must not silently
      // swallow the error here as that would hide misconfiguration or outages.
      throw error;
    }
  }
}
