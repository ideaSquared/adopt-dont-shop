import type { QueryInterface } from 'sequelize';
import { createIndexConcurrently, dropIndexConcurrently } from './_helpers';

/**
 * ADS-504: Add `WHERE deleted_at IS NULL` partial indexes for the
 * highest-traffic lookup paths on paranoid tables.
 *
 * `paranoid: true` rewrites every default `find*` query with
 * `... AND deleted_at IS NULL`. Existing single-column indexes
 * (`users(email)`, `pets(status)`, `applications(status, rescue_id)`)
 * include soft-deleted rows, so the planner either does a heap recheck
 * or falls back to a sequential scan once the soft-deleted population
 * is non-trivial.
 *
 * Three partial indexes:
 *
 *   users_email_active_idx        — login / "is this email taken" checks.
 *   pets_status_active_idx        — public listings ("show me available pets").
 *   applications_rescue_status_active_idx
 *                                  — rescue dashboard's primary query.
 *
 * Built CONCURRENTLY (ADS-402): all three tables are in the request hot
 * path, so we cannot tolerate the ShareLock from a standard
 * `CREATE INDEX`.
 */
const INDEXES = [
  {
    name: 'users_email_active_idx',
    table: 'users',
    columns: ['email'],
    unique: true,
    where: 'deleted_at IS NULL',
  },
  {
    name: 'pets_status_active_idx',
    table: 'pets',
    columns: ['status'],
    where: 'deleted_at IS NULL',
  },
  {
    name: 'applications_rescue_status_active_idx',
    table: 'applications',
    columns: ['rescue_id', 'status'],
    where: 'deleted_at IS NULL',
  },
] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    for (const idx of INDEXES) {
      await createIndexConcurrently(queryInterface.sequelize, idx);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverse order is irrelevant for index drops, but kept symmetric.
    for (const idx of [...INDEXES].reverse()) {
      await dropIndexConcurrently(queryInterface.sequelize, idx.name);
    }
  },
};
