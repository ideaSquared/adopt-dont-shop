import { DataTypes } from 'sequelize';
import sequelize from '../../sequelize';
import '../../models/index';

const toSnakeCase = (str: string) => str.replace(/([A-Z])/g, '_$1').toLowerCase();

// Reference/config tables allowed to keep INTEGER autoIncrement PKs
const INTEGER_PK_WHITELIST = new Set([
  'Role',
  'Permission',
  'RolePermission',
  'FieldPermission',
  'AuditLog',
]);

// Tables with composite PKs — excluded from single-PK checks
const COMPOSITE_PK_MODELS = new Set(['RolePermission', 'UserRole']);

type ModelAttribute = {
  type: { key: string };
  primaryKey?: boolean;
  autoIncrement?: boolean;
  defaultValue?: unknown;
  field?: string;
  references?: unknown;
};

describe('Model Standards', () => {
  describe('underscored: true', () => {
    it('every registered model has underscored: true', () => {
      const failures: string[] = [];
      Object.values(sequelize.models).forEach(model => {
        const underscored = (model as unknown as { options: { underscored?: boolean } }).options
          .underscored;
        if (!underscored) failures.push(model.name);
      });
      expect(failures, `Models missing underscored: true — ${failures.join(', ')}`).toHaveLength(0);
    });
  });

  describe('primary key strategy', () => {
    it('entity models do not use autoIncrement PKs', () => {
      const failures: string[] = [];
      Object.values(sequelize.models)
        .filter(m => !INTEGER_PK_WHITELIST.has(m.name))
        .forEach(model => {
          const pkAttrs = Object.values(
            model.getAttributes() as Record<string, ModelAttribute>
          ).filter(a => a.primaryKey);
          if (pkAttrs.some(pk => pk.autoIncrement)) failures.push(model.name);
        });
      expect(
        failures,
        `Entity models using autoIncrement PK — ${failures.join(', ')}`
      ).toHaveLength(0);
    });

    it('no model uses DataTypes.UUIDV4 as a default value', () => {
      const failures: string[] = [];
      Object.values(sequelize.models).forEach(model => {
        Object.entries(model.getAttributes() as Record<string, ModelAttribute>).forEach(
          ([fieldName, attr]) => {
            if (attr.defaultValue === DataTypes.UUIDV4) {
              failures.push(`${model.name}.${fieldName}`);
            }
          }
        );
      });
      expect(
        failures,
        `Fields still using DataTypes.UUIDV4 (use generateUuidV7 instead) — ${failures.join(', ')}`
      ).toHaveLength(0);
    });
  });

  describe('FK index coverage', () => {
    it('every FK column has an index', () => {
      const failures: string[] = [];

      Object.values(sequelize.models).forEach(model => {
        const attrs = model.getAttributes() as Record<string, ModelAttribute>;
        const rawOptions = (
          model as unknown as {
            options: { indexes?: Array<{ fields: Array<string | { name: string }> }> };
          }
        ).options;
        const indexes = rawOptions.indexes ?? [];

        const indexedCols = new Set<string>(
          indexes.flatMap(idx => idx.fields.map(f => (typeof f === 'string' ? f : f.name)))
        );

        // PKs are always indexed
        Object.entries(attrs)
          .filter(([, a]) => a.primaryKey)
          .forEach(([name, a]) => {
            indexedCols.add(a.field ?? toSnakeCase(name));
          });

        // Check that every FK column appears in at least one index
        Object.entries(attrs)
          .filter(([, a]) => Boolean(a.references))
          .forEach(([name, a]) => {
            const col = a.field ?? toSnakeCase(name);
            if (!indexedCols.has(col)) {
              failures.push(`${model.name}.${col}`);
            }
          });
      });

      expect(failures, `FK columns without an index — ${failures.join(', ')}`).toHaveLength(0);
    });
  });

  describe('soft-delete consistency', () => {
    it('models that use paranoid do not also define a manual isDeleted column', () => {
      const failures: string[] = [];
      // Legacy models still carry manual isDeleted columns alongside the global
      // paranoid default. Cleanup is tracked as a Phase 3 item.
      const LEGACY_MANUAL_SOFT_DELETE = new Set(['Rescue', 'StaffMember']);
      Object.values(sequelize.models).forEach(model => {
        if (LEGACY_MANUAL_SOFT_DELETE.has(model.name)) return;
        const opts = (model as unknown as { options: { paranoid?: boolean } }).options;
        const attrs = model.getAttributes() as Record<string, ModelAttribute>;
        if (opts.paranoid && 'isDeleted' in attrs) {
          failures.push(model.name);
        }
      });
      expect(
        failures,
        `Models with both paranoid and isDeleted — ${failures.join(', ')}`
      ).toHaveLength(0);
    });
  });
});
