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
        if (!underscored) {
          failures.push(model.name);
        }
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
          if (pkAttrs.some(pk => pk.autoIncrement)) {
            failures.push(model.name);
          }
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

    // Plan 5.5.2 — Postgres doesn't auto-pick a sane default and Sequelize
    // varies by dialect, so every FK gets the on-delete semantics declared
    // explicitly. Sequelize stores the value at attr.onDelete (set via the
    // column definition's `onDelete` option).
    it('every FK column declares onDelete explicitly', () => {
      const failures: string[] = [];

      Object.values(sequelize.models).forEach(model => {
        const attrs = model.getAttributes() as Record<
          string,
          ModelAttribute & { onDelete?: string }
        >;
        Object.entries(attrs)
          .filter(([, a]) => Boolean(a.references))
          .forEach(([name, a]) => {
            if (!a.onDelete) {
              failures.push(`${model.name}.${name}`);
            }
          });
      });

      expect(
        failures,
        `FK columns without explicit onDelete — ${failures.join(', ')}`
      ).toHaveLength(0);
    });
  });

  describe('soft-delete consistency', () => {
    it('no model carries a manual isDeleted column alongside paranoid', () => {
      const failures: string[] = [];
      Object.values(sequelize.models).forEach(model => {
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

    // paranoid: true filters every find on `deleted_at IS NULL`. Without
    // an index Postgres can't use it to skip soft-deleted rows; the
    // alternative is a sequential scan on every lookup (plan 4.4).
    //
    // The check is whitelist-driven rather than blanket because the global
    // sequelize.define.paranoid: true gives every model a deleted_at
    // column it might not actually want. The whitelist tracks the models
    // that explicitly opt into soft-delete and need the index to back it;
    // sorting which inherited-paranoid models truly want soft-delete vs
    // which should opt out via paranoid: false is a separate slice.
    const PARANOID_MODELS = [
      'User',
      'Pet',
      'Application',
      'ApplicationQuestion',
      'Rescue',
      'Notification',
      'DeviceToken',
      'Content',
      'EmailTemplate',
      'StaffMember',
      'SupportTicketResponse',
      'UserFavorite',
    ];

    it.each(PARANOID_MODELS)('%s has a deleted_at index', name => {
      const model = sequelize.models[name];
      expect(model, `${name} not registered`).toBeDefined();
      const opts = (
        model as unknown as {
          options: { indexes?: Array<{ fields: Array<string | { name: string }> }> };
        }
      ).options;
      const indexedCols = new Set(
        (opts.indexes ?? []).flatMap(i => i.fields.map(f => (typeof f === 'string' ? f : f.name)))
      );
      expect(indexedCols.has('deleted_at'), `${name} missing deleted_at index`).toBe(true);
    });
  });

  describe('audit columns', () => {
    // Every transactional model gets created_by / updated_by / version.
    // The set excludes:
    //   - reference / config tables (Role, Permission, RolePermission,
    //     UserRole, FieldPermission)
    //   - append-only event logs (AuditLog, ApplicationTimeline)
    //   - high-volume user-activity rows already keyed by user_id
    //     (SwipeAction, SwipeSession, RefreshToken, DeviceToken)
    const HAS_AUDIT_COLUMNS = [
      // Slice 1
      'User',
      'Pet',
      'Application',
      'Rescue',
      'Message',
      // Slice 2 (this PR)
      'Notification',
      'Chat',
      'ChatParticipant',
      'Invitation',
      'HomeVisit',
      'Report',
      'ModeratorAction',
      'UserSanction',
      'SupportTicket',
      'SupportTicketResponse',
      'Rating',
      'EmailQueue',
      'EmailTemplate',
      'EmailPreference',
      'StaffMember',
      'Content',
      'NavigationMenu',
      'FileUpload',
      'UserFavorite',
      'ApplicationQuestion',
    ];

    it.each(HAS_AUDIT_COLUMNS)('%s has created_by, updated_by, version', name => {
      const model = sequelize.models[name];
      expect(model, `${name} not registered`).toBeDefined();
      const attrs = model.getAttributes() as Record<string, ModelAttribute>;
      expect(attrs).toHaveProperty('created_by');
      expect(attrs).toHaveProperty('updated_by');
      // version: true makes Sequelize add the column under "version".
      expect(attrs).toHaveProperty('version');
    });

    it.each(HAS_AUDIT_COLUMNS)('%s has indexes on created_by and updated_by', name => {
      const model = sequelize.models[name];
      const opts = (
        model as unknown as {
          options: { indexes?: Array<{ fields: Array<string | { name: string }> }> };
        }
      ).options;
      const cols = new Set(
        (opts.indexes ?? []).flatMap(i => i.fields.map(f => (typeof f === 'string' ? f : f.name)))
      );
      expect(cols.has('created_by'), `${name} missing created_by index`).toBe(true);
      expect(cols.has('updated_by'), `${name} missing updated_by index`).toBe(true);
    });
  });
});
