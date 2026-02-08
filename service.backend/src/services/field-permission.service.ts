import FieldPermission, {
  FieldAccessLevel,
  FieldPermissionResource,
} from '../models/FieldPermission';
import AuditLog from '../models/AuditLog';
import { logger } from '../utils/logger';
import { clearFieldPermissionCache } from '../middleware/field-permissions';

export class FieldPermissionService {
  /**
   * Get all field permission overrides for a resource.
   */
  static async getByResource(resource: FieldPermissionResource): Promise<FieldPermission[]> {
    return FieldPermission.findAll({
      where: { resource },
      order: [['fieldName', 'ASC'], ['role', 'ASC']],
    });
  }

  /**
   * Get field permission overrides for a specific resource and role.
   */
  static async getByResourceAndRole(
    resource: FieldPermissionResource,
    role: string
  ): Promise<FieldPermission[]> {
    return FieldPermission.findAll({
      where: { resource, role },
      order: [['fieldName', 'ASC']],
    });
  }

  /**
   * Create or update a field permission override.
   * Uses upsert to handle both create and update in one operation.
   */
  static async upsert(
    resource: FieldPermissionResource,
    fieldName: string,
    role: string,
    accessLevel: FieldAccessLevel,
    updatedBy: string
  ): Promise<FieldPermission> {
    const [record] = await FieldPermission.upsert(
      {
        resource,
        fieldName,
        role,
        accessLevel,
      },
      {
        conflictFields: ['resource', 'field_name', 'role'],
      }
    );

    // Clear cache so changes take effect immediately
    clearFieldPermissionCache(resource, role);

    // Audit log the change
    await AuditLog.create({
      service: 'field-permissions',
      user: updatedBy,
      action: `field_permission_upsert`,
      level: 'INFO',
      status: 'success',
      category: 'FIELD_PERMISSION_CHANGE',
      metadata: {
        resource,
        fieldName,
        role,
        accessLevel,
      },
    });

    logger.info('Field permission upserted', { resource, fieldName, role, accessLevel, updatedBy });

    return record;
  }

  /**
   * Bulk upsert field permission overrides.
   */
  static async bulkUpsert(
    overrides: ReadonlyArray<{
      resource: FieldPermissionResource;
      fieldName: string;
      role: string;
      accessLevel: FieldAccessLevel;
    }>,
    updatedBy: string
  ): Promise<FieldPermission[]> {
    const results: FieldPermission[] = [];

    for (const override of overrides) {
      const record = await FieldPermissionService.upsert(
        override.resource,
        override.fieldName,
        override.role,
        override.accessLevel,
        updatedBy
      );
      results.push(record);
    }

    return results;
  }

  /**
   * Delete a field permission override, reverting to the default.
   */
  static async deleteOverride(
    resource: FieldPermissionResource,
    role: string,
    fieldName: string,
    deletedBy: string
  ): Promise<boolean> {
    const deleted = await FieldPermission.destroy({
      where: { resource, role, fieldName },
    });

    if (deleted > 0) {
      clearFieldPermissionCache(resource, role);

      await AuditLog.create({
        service: 'field-permissions',
        user: deletedBy,
        action: 'field_permission_delete',
        level: 'INFO',
        status: 'success',
        category: 'FIELD_PERMISSION_CHANGE',
        metadata: {
          resource,
          fieldName,
          role,
        },
      });

      logger.info('Field permission override deleted', { resource, fieldName, role, deletedBy });
    }

    return deleted > 0;
  }

  /**
   * Delete all overrides for a resource and role.
   */
  static async deleteAllForRole(
    resource: FieldPermissionResource,
    role: string,
    deletedBy: string
  ): Promise<number> {
    const deleted = await FieldPermission.destroy({
      where: { resource, role },
    });

    if (deleted > 0) {
      clearFieldPermissionCache(resource, role);

      await AuditLog.create({
        service: 'field-permissions',
        user: deletedBy,
        action: 'field_permission_bulk_delete',
        level: 'WARNING',
        status: 'success',
        category: 'FIELD_PERMISSION_CHANGE',
        metadata: {
          resource,
          role,
          deletedCount: deleted,
        },
      });

      logger.info('Field permission overrides bulk deleted', { resource, role, deleted, deletedBy });
    }

    return deleted;
  }
}
