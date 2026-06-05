import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — users.
//
// Direct port of service.backend's 00-baseline-001-users.ts INTO the
// `auth` schema, with the 01-add-user-type-support-agent-super-admin.ts
// follow-up folded in (the user_type enum here carries all 6 values the
// monolith's CURRENT state has). FKs (created_by, updated_by) are
// deliberately omitted — they're self-referential audit pointers that
// the schema-per-service rule keeps application-side.
//
// Extensions: `citext` (case-insensitive email) and `postgis` (the
// `location` POINT column) live in `public` — the postgis Docker image +
// the @adopt-dont-shop/db search_path (`auth, public`) make them
// resolvable. CREATE EXTENSION IF NOT EXISTS keeps the service
// self-contained without depending on init-postgis.sql ordering.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;');

  pgm.createType('user_status', [
    'active',
    'inactive',
    'suspended',
    'pending_verification',
    'deactivated',
  ]);
  // All 6 values from the monolith's current state (4 baseline + 2 added
  // by 01-add-user-type-support-agent-super-admin.ts). Matches
  // lib.types.UserRole and @adopt-dont-shop/authz.
  pgm.createType('user_type', [
    'adopter',
    'rescue_staff',
    'admin',
    'moderator',
    'super_admin',
    'support_agent',
  ]);

  pgm.createTable('users', {
    user_id: { type: 'uuid', primaryKey: true },
    first_name: { type: 'varchar(100)' },
    last_name: { type: 'varchar(100)' },
    email: { type: 'public.citext', notNull: true, unique: true },
    password: { type: 'varchar(255)', notNull: true },
    email_verified: { type: 'boolean', notNull: true, default: false },
    verification_token: { type: 'varchar(255)' },
    verification_token_expires_at: { type: 'timestamptz' },
    reset_token: { type: 'varchar(255)' },
    reset_token_expiration: { type: 'timestamptz' },
    reset_token_force_flag: { type: 'boolean', notNull: true, default: false },
    phone_number: { type: 'varchar(20)' },
    phone_verified: { type: 'boolean', notNull: true, default: false },
    date_of_birth: { type: 'date' },
    profile_image_url: { type: 'text' },
    bio: { type: 'text' },
    status: { type: 'user_status', notNull: true, default: 'pending_verification' },
    user_type: { type: 'user_type', notNull: true, default: 'adopter' },
    last_login_at: { type: 'timestamptz' },
    login_attempts: { type: 'integer', notNull: true, default: 0 },
    locked_until: { type: 'timestamptz' },
    two_factor_enabled: { type: 'boolean', notNull: true, default: false },
    two_factor_secret: { type: 'varchar(255)' },
    backup_codes: { type: 'text[]' },
    timezone: { type: 'varchar(50)', default: 'UTC' },
    language: { type: 'varchar(10)', default: 'en' },
    country: { type: 'varchar(100)' },
    city: { type: 'varchar(100)' },
    address_line_1: { type: 'varchar(255)' },
    address_line_2: { type: 'varchar(255)' },
    postal_code: { type: 'varchar(20)' },
    location: { type: 'public.geometry(Point)' },
    terms_accepted_at: { type: 'timestamptz' },
    privacy_policy_accepted_at: { type: 'timestamptz' },
    application_defaults: { type: 'jsonb' },
    profile_completion_status: {
      type: 'jsonb',
      default: pgm.func(
        `'{"basic_info":false,"living_situation":false,"pet_experience":false,"references":false,"overall_percentage":0,"last_updated":null}'::jsonb`
      ),
    },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  // Index names mirror the monolith so dual-stack debugging stays legible.
  pgm.createIndex('users', 'email', { name: 'users_email_unique', unique: true });
  pgm.createIndex('users', 'status', { name: 'users_status_idx' });
  pgm.createIndex('users', 'user_type', { name: 'users_user_type_idx' });
  pgm.createIndex('users', 'created_at', { name: 'users_created_at_idx' });
  pgm.createIndex('users', 'deleted_at', { name: 'users_deleted_at_idx' });
  pgm.createIndex('users', 'created_by', { name: 'users_created_by_idx' });
  pgm.createIndex('users', 'updated_by', { name: 'users_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('users');
  pgm.dropType('user_type');
  pgm.dropType('user_status');
};
