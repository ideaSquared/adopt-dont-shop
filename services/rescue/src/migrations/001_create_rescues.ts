import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — rescues.
//
// Direct port of service.backend's 00-baseline-012-rescues.ts INTO the
// `rescue` schema. The headline row for the vertical: organisation
// identity, address, verification state, settings JSON blob.
//
// citext lives in `public` (extension created here, idempotent). FK
// pointers verified_by / created_by / updated_by → auth.users are
// CROSS-schema, left FK-free (audit-pointer convention).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;');

  pgm.createType('rescue_status', ['pending', 'verified', 'suspended', 'inactive', 'rejected']);
  pgm.createType('rescue_verification_source', ['companies_house', 'charity_commission', 'manual']);

  pgm.createTable('rescues', {
    rescue_id: { type: 'uuid', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true, unique: true },
    email: { type: 'public.citext', notNull: true, unique: true },
    phone: { type: 'varchar(255)' },
    address: { type: 'text', notNull: true },
    city: { type: 'varchar(255)', notNull: true },
    // Model attribute `county` maps to legacy column `state`.
    state: { type: 'varchar(255)' },
    // Model attribute `postcode` maps to legacy column `zip_code`.
    zip_code: { type: 'varchar(255)', notNull: true },
    country: { type: 'char(2)', notNull: true, default: 'GB' },
    website: { type: 'varchar(255)' },
    description: { type: 'text' },
    mission: { type: 'text' },
    companies_house_number: { type: 'varchar(8)', unique: true },
    charity_registration_number: { type: 'varchar(12)', unique: true },
    contact_person: { type: 'varchar(255)', notNull: true },
    contact_title: { type: 'varchar(255)' },
    contact_email: { type: 'varchar(255)' },
    contact_phone: { type: 'varchar(255)' },
    status: { type: 'rescue_status', notNull: true, default: 'pending' },
    verified_at: { type: 'timestamptz' },
    verified_by: { type: 'uuid' },
    verification_source: { type: 'rescue_verification_source' },
    verification_failure_reason: { type: 'text' },
    manual_verification_requested_at: { type: 'timestamptz' },
    settings: { type: 'jsonb', default: pgm.func("'{}'::jsonb") },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('rescues', 'verified_by', { name: 'rescues_verified_by_idx' });
  pgm.createIndex('rescues', 'deleted_at', { name: 'rescues_deleted_at_idx' });
  pgm.createIndex('rescues', 'created_by', { name: 'rescues_created_by_idx' });
  pgm.createIndex('rescues', 'updated_by', { name: 'rescues_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('rescues');
  pgm.dropType('rescue_status');
  pgm.dropType('rescue_verification_source');
};
