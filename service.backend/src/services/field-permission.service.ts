import { Transaction, UniqueConstraintError } from 'sequelize';
import FieldPermission, {
  FieldAccessLevel,
  FieldPermissionResource,
} from '../models/FieldPermission';
import { AuditLogService } from './auditLog.service';
import sequelize from '../sequelize';
import { logger } from '../utils/logger';
import { clearFieldPermissionCache } from '../middleware/field-permissions';

export class FieldPermissionService {
  /**
   * Get all field permission overrides for a resource.
   */
  static async getByResource(resource: FieldPermissionResource): Promise<FieldPermission[]> {
    return FieldPermission.findAll({
      where: { resource },
      order: [
        ['field_name', 'ASC'],
        ['role', 'ASC'],
      ],
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
      order: [['field_name', 'ASC']],
    });
  }

  /**
   * Create or update a field permission override.
   *
   * Uses an explicit find-then-update/create pattern with retry on
   * unique-constraint violation to handle concurrent inserts safely.
   *
   * Accepts an optional transaction for use within bulk operations.
   */
  static async upsert(
    resource: FieldPermissionResource,
    field_name: string,
    role: string,
    access_level: FieldAccessLevel,
    updatedBy: string,
    transaction?: Transaction
  ): Promise<FieldPermission> {
    // findOrCreateAndUpdate returns both the new/updated record AND the
    // previous access_level it observed before mutating, so the audit row
    // can express the change as a before/after diff without re-querying.
    const { record, previousAccessLevel } = await FieldPermissionService.findOrCreateAndUpdate(
      resource,
      field_name,
      role,
      access_level,
      transaction
    );

    clearFieldPermissionCache(resource, role);

    await AuditLogService.log({
      userId: updatedBy,
      action: 'FIELD_PERMISSION_UPSERTED',
      entity: 'FieldPermission',
      entityId: `${resource}:${role}:${field_name}`,
      details: {
        resource,
        field_name,
        role,
        diff: {
          access_level: { before: previousAccessLevel, after: access_level },
        },
      },
      service: 'field-permissions',
      transaction,
    });

    logger.info('Field permission upserted', {
      resource,
      field_name,
      role,
      access_level,
      updatedBy,
    });

    return record;
  }

  /**
   * Find-or-create a FieldPermission row, then update its access_level.
   * Retries once on unique-constraint violation to handle the race where
   * two concurrent callers both observe "not found" and both try to insert.
   *
   * Returns the final record plus the previous access_level (null on
   * insert) so the caller can emit a before/after audit diff without a
   * second SELECT round-trip.
   */
  private static async findOrCreateAndUpdate(
    resource: FieldPermissionResource,
    field_name: string,
    role: string,
    access_level: FieldAccessLevel,
    transaction?: Transaction
  ): Promise<{ record: FieldPermission; previousAccessLevel: FieldAccessLevel | null }> {
    const existing = await FieldPermission.findOne({
      where: { resource, field_name, role },
      transaction,
    });

    if (existing) {
      const previousAccessLevel = existing.access_level;
      const record = await existing.update({ access_level }, { transaction });
      return { record, previousAccessLevel };
    }

    try {
      const record = await FieldPermission.create(
        { resource, field_name, role, access_level },
        { transaction }
      );
      return { record, previousAccessLevel: null };
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) {
        throw error;
      }

      const conflict = await FieldPermission.findOne({
        where: { resource, field_name, role },
        transaction,
      });

      if (!conflict) {
        throw error;
      }

      const previousAccessLevel = conflict.access_level;
      const record = await conflict.update({ access_level }, { transaction });
      return { record, previousAccessLevel };
    }
  }

  /**
   * Bulk upsert field permission overrides.
   * All operations run within a single database transaction for atomicity.
   */
  static async bulkUpsert(
    overrides: ReadonlyArray<{
      resource: FieldPermissionResource;
      field_name: string;
      role: string;
      access_level: FieldAccessLevel;
    }>,
    updatedBy: string
  ): Promise<FieldPermission[]> {
    return sequelize.transaction(async (transaction: Transaction) => {
      const results: FieldPermission[] = [];

      for (const override of overrides) {
        const record = await FieldPermissionService.upsert(
          override.resource,
          override.field_name,
          override.role,
          override.access_level,
          updatedBy,
          transaction
        );
        results.push(record);
      }

      return results;
    });
  }

  /**
   * Delete a field permission override, reverting to the default.
   */
  static async deleteOverride(
    resource: FieldPermissionResource,
    role: string,
    field_name: string,
    deletedBy: string
  ): Promise<boolean> {
    const deleted = await FieldPermission.destroy({
      where: { resource, role, field_name },
    });

    if (deleted > 0) {
      clearFieldPermissionCache(resource, role);

      await AuditLogService.log({
        userId: deletedBy,
        action: 'FIELD_PERMISSION_DELETED',
        entity: 'FieldPermission',
        entityId: `${resource}:${role}:${field_name}`,
        details: { resource, field_name, role },
        service: 'field-permissions',
      });

      logger.info('Field permission override deleted', { resource, field_name, role, deletedBy });
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

      await AuditLogService.log({
        userId: deletedBy,
        action: 'FIELD_PERMISSION_BULK_DELETED',
        entity: 'FieldPermission',
        entityId: `${resource}:${role}:*`,
        details: { resource, role, deletedCount: deleted },
        service: 'field-permissions',
        level: 'WARNING',
      });

      logger.info('Field permission overrides bulk deleted', {
        resource,
        role,
        deleted,
        deletedBy,
      });
    }

    return deleted;
  }
}
