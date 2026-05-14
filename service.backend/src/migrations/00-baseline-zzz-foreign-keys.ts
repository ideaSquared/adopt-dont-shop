import type { QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model rebaseline (FK file): cross-table FOREIGN KEY constraints.
 *
 * Why this file exists separately from the 61 per-model baselines (PRs
 * #441–450): each per-model file declares its own table's columns,
 * including FK *column* shapes (UUID, NOT NULL where appropriate), but
 * intentionally omits cross-table FK CONSTRAINTS. Splitting the
 * constraints out means each per-model baseline can be reordered or
 * replaced independently — the FK file runs last (lex order `...zzz...`
 * sorts after every numbered baseline), by which point every referenced
 * table exists.
 *
 * Source of truth for each entry below is `sequelize.sync()` against the
 * model code shipped in `service.backend/src/models/*.ts`. Two Sequelize
 * mechanisms determine the final ON DELETE / ON UPDATE seen at sync()
 * time (see lib/dialects/postgres/query-generator.js and
 * lib/associations/belongs-to.js):
 *
 *   1. The column-level `references: { ... }, onDelete: '...',
 *      onUpdate: '...'` declaration on the model. This is the model
 *      author's intent.
 *   2. `Model.belongsTo()` (and `hasMany`/`hasOne`/`belongsToMany`) call
 *      `_injectAttributes` which fills in missing `onDelete` / `onUpdate`
 *      via `mergeDefaults`. The fill defaults are:
 *        - `onDelete`: `'SET NULL'` if the column is nullable, else
 *          `'NO ACTION'` (belongsTo) or `'CASCADE'` (hasMany/hasOne).
 *        - `onUpdate`: `'CASCADE'`.
 *      Associations declared with `constraints: false` skip injection
 *      AND skip emitting any DB-level FK (so those columns don't appear
 *      below at all).
 *
 * Naming convention: the per-table default `<table>_<column>_fkey`,
 * matching Postgres' implicit name for `ADD CONSTRAINT ... FOREIGN KEY`
 * with no explicit name. This is also what `sequelize.sync()` produces.
 * The CI schema-equivalence gate (PR #452) byte-compares DB-A
 * (db:migrate, includes this file) against DB-B (sync()) so any naming
 * drift would surface as a diff.
 *
 * Idempotency: Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so each
 * constraint is gated on a `pg_constraint` precheck (same pattern as
 * PR #451 for migration 04's unique constraint). This matters because:
 *   - `04-add-invitation-indexes-and-constraints.ts` already creates
 *     `invitations_rescue_id_fkey` and `invitations_user_id_fkey` via
 *     `removeConstraint + addConstraint`. On a fresh DB that runs the
 *     baselines first, this file installs those FKs; migration 04 then
 *     idempotently drops-and-readds them with the same definitions.
 *   - Re-running `up()` after a partial failure must not throw.
 *
 * Explicit non-FK references (no DB constraint emitted by sync(), so
 * none added here):
 *   - `audit_logs.user`: soft reference to `users.user_id`. The
 *     association in `models/index.ts` is `constraints: false` so audit
 *     rows survive their user being deleted (per AuditLog.ts header
 *     comment). Confirmed by D10.
 *   - `application_timeline.{application_id, created_by}`,
 *     `pet_status_transitions.transitioned_by`,
 *     `home_visit_status_transitions.transitioned_by`,
 *     `report_status_transitions.transitioned_by`,
 *     `application_references.contacted_by` (association only —
 *     constraints:false), `message_reads.user_id` (association only),
 *     `email_template_versions.created_by` (association only),
 *     `moderation_evidence.parent_id`: same pattern — forensic /
 *     polymorphic references with `constraints: false`. The column
 *     itself has no `references:` clause OR it does but the only
 *     association uses `constraints: false`, so sync() emits no FK.
 *   - `addresses.{owner_type, owner_id}`: polymorphic pointer. No FK.
 *
 * Down: drops every constraint, gated by
 * `assertDestructiveDownAcknowledged` — dropping every cross-table FK
 * in production is destructive enough that rollback should be a backup
 * restore, not a `db:migrate:undo`.
 */
const MIGRATION_KEY = '00-baseline-zzz-foreign-keys';

type ForeignKeySpec = {
  table: string;
  column: string;
  refTable: string;
  refKey: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'SET DEFAULT' | 'RESTRICT';
  onUpdate: 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'SET DEFAULT' | 'RESTRICT' | null;
};

const constraintName = (table: string, column: string): string => `${table}_${column}_fkey`;

const FOREIGN_KEYS: ReadonlyArray<ForeignKeySpec> = [
  // -- addresses --
  {
    table: 'addresses',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'addresses',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- application_answers --
  {
    table: 'application_answers',
    column: 'application_id',
    refTable: 'applications',
    refKey: 'application_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'application_answers',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'application_answers',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- application_questions --
  {
    table: 'application_questions',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'application_questions',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'application_questions',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- application_references --
  {
    table: 'application_references',
    column: 'application_id',
    refTable: 'applications',
    refKey: 'application_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'application_references',
    column: 'contacted_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'application_references',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'application_references',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- application_status_transitions --
  {
    table: 'application_status_transitions',
    column: 'application_id',
    refTable: 'applications',
    refKey: 'application_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'application_status_transitions',
    column: 'transitioned_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },

  // -- applications --
  {
    table: 'applications',
    column: 'actioned_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'applications',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'applications',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'applications',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'applications',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'applications',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- breeds --
  {
    table: 'breeds',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'breeds',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- chat_participants --
  {
    table: 'chat_participants',
    column: 'chat_id',
    refTable: 'chats',
    refKey: 'chat_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'chat_participants',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'chat_participants',
    column: 'participant_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'chat_participants',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- chats --
  {
    table: 'chats',
    column: 'application_id',
    refTable: 'applications',
    refKey: 'application_id',
    onDelete: 'CASCADE',
    onUpdate: null,
  },
  {
    table: 'chats',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'chats',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'chats',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'chats',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- cms_content --
  {
    table: 'cms_content',
    column: 'author_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'cms_content',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'cms_content',
    column: 'last_modified_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'cms_content',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- cms_navigation_menus --
  {
    table: 'cms_navigation_menus',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'cms_navigation_menus',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- device_tokens --
  {
    table: 'device_tokens',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- email_preferences --
  {
    table: 'email_preferences',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'email_preferences',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'email_preferences',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- email_queue --
  {
    table: 'email_queue',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'email_queue',
    column: 'template_id',
    refTable: 'email_templates',
    refKey: 'template_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'email_queue',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'email_queue',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },

  // -- email_template_versions --
  {
    table: 'email_template_versions',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'email_template_versions',
    column: 'template_id',
    refTable: 'email_templates',
    refKey: 'template_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'email_template_versions',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- email_templates --
  {
    table: 'email_templates',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'email_templates',
    column: 'last_modified_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'email_templates',
    column: 'parent_template_id',
    refTable: 'email_templates',
    refKey: 'template_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'email_templates',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- file_uploads --
  {
    table: 'file_uploads',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'file_uploads',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'file_uploads',
    column: 'uploaded_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },

  // -- home_visit_status_transitions --
  {
    table: 'home_visit_status_transitions',
    column: 'visit_id',
    refTable: 'home_visits',
    refKey: 'visit_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- home_visits --
  {
    table: 'home_visits',
    column: 'application_id',
    refTable: 'applications',
    refKey: 'application_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'home_visits',
    column: 'assigned_staff',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'home_visits',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'home_visits',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- idempotency_keys --
  {
    table: 'idempotency_keys',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- invitations --
  {
    table: 'invitations',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'invitations',
    column: 'invited_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'invitations',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'invitations',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'invitations',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },

  // -- message_reactions --
  {
    table: 'message_reactions',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'message_reactions',
    column: 'message_id',
    refTable: 'messages',
    refKey: 'message_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'message_reactions',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'message_reactions',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- message_reads --
  {
    table: 'message_reads',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'message_reads',
    column: 'message_id',
    refTable: 'messages',
    refKey: 'message_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'message_reads',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'message_reads',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },

  // -- messages --
  {
    table: 'messages',
    column: 'chat_id',
    refTable: 'chats',
    refKey: 'chat_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'messages',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'messages',
    column: 'sender_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'messages',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- moderation_evidence --
  {
    table: 'moderation_evidence',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'moderation_evidence',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- moderator_actions --
  {
    table: 'moderator_actions',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'moderator_actions',
    column: 'moderator_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'moderator_actions',
    column: 'report_id',
    refTable: 'reports',
    refKey: 'report_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'moderator_actions',
    column: 'reversed_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'moderator_actions',
    column: 'target_user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'moderator_actions',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- notifications --
  {
    table: 'notifications',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'notifications',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'notifications',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- pet_media --
  {
    table: 'pet_media',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'pet_media',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'pet_media',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- pet_status_transitions --
  {
    table: 'pet_status_transitions',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- pets --
  {
    table: 'pets',
    column: 'breed_id',
    refTable: 'breeds',
    refKey: 'breed_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'pets',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'pets',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'pets',
    column: 'secondary_breed_id',
    refTable: 'breeds',
    refKey: 'breed_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'pets',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- ratings --
  {
    table: 'ratings',
    column: 'application_id',
    refTable: 'applications',
    refKey: 'application_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'ratings',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'ratings',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'ratings',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ratings',
    column: 'reviewee_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ratings',
    column: 'reviewer_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ratings',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- refresh_tokens --
  {
    table: 'refresh_tokens',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- report_shares --
  {
    table: 'report_shares',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'report_shares',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- report_status_transitions --
  {
    table: 'report_status_transitions',
    column: 'report_id',
    refTable: 'reports',
    refKey: 'report_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- report_templates --
  {
    table: 'report_templates',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'report_templates',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- reports --
  {
    table: 'reports',
    column: 'assigned_moderator',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'reports',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'reports',
    column: 'escalated_to',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'reports',
    column: 'reported_user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'reports',
    column: 'reporter_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'reports',
    column: 'resolved_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'reports',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- rescue_settings --
  {
    table: 'rescue_settings',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'rescue_settings',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'rescue_settings',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- rescues --
  {
    table: 'rescues',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'rescues',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'rescues',
    column: 'verified_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- role_permissions --
  {
    table: 'role_permissions',
    column: 'permission_id',
    refTable: 'permissions',
    refKey: 'permission_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'role_permissions',
    column: 'role_id',
    refTable: 'roles',
    refKey: 'role_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- saved_reports --
  {
    table: 'saved_reports',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'saved_reports',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- scheduled_reports --
  {
    table: 'scheduled_reports',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'scheduled_reports',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- staff_members --
  {
    table: 'staff_members',
    column: 'added_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'staff_members',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'staff_members',
    column: 'rescue_id',
    refTable: 'rescues',
    refKey: 'rescue_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'staff_members',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'staff_members',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'staff_members',
    column: 'verified_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- support_ticket_responses --
  {
    table: 'support_ticket_responses',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'support_ticket_responses',
    column: 'responder_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'support_ticket_responses',
    column: 'ticket_id',
    refTable: 'support_tickets',
    refKey: 'ticket_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'support_ticket_responses',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },

  // -- support_tickets --
  {
    table: 'support_tickets',
    column: 'assigned_to',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'support_tickets',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'support_tickets',
    column: 'escalated_to',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'support_tickets',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'support_tickets',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },

  // -- swipe_actions --
  {
    table: 'swipe_actions',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'swipe_actions',
    column: 'session_id',
    refTable: 'swipe_sessions',
    refKey: 'session_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'swipe_actions',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- swipe_sessions --
  {
    table: 'swipe_sessions',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_application_prefs --
  {
    table: 'user_application_prefs',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_application_prefs',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_application_prefs',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_consents --
  {
    table: 'user_consents',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_consents',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_consents',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_favorites --
  {
    table: 'user_favorites',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_favorites',
    column: 'pet_id',
    refTable: 'pets',
    refKey: 'pet_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'user_favorites',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_favorites',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_notification_prefs --
  {
    table: 'user_notification_prefs',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_notification_prefs',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_notification_prefs',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_privacy_prefs --
  {
    table: 'user_privacy_prefs',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_privacy_prefs',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_privacy_prefs',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_roles --
  {
    table: 'user_roles',
    column: 'role_id',
    refTable: 'roles',
    refKey: 'role_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'user_roles',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- user_sanctions --
  {
    table: 'user_sanctions',
    column: 'appeal_resolved_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_sanctions',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_sanctions',
    column: 'issued_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'user_sanctions',
    column: 'moderator_action_id',
    refTable: 'moderator_actions',
    refKey: 'action_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'user_sanctions',
    column: 'report_id',
    refTable: 'reports',
    refKey: 'report_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'user_sanctions',
    column: 'revoked_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_sanctions',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'user_sanctions',
    column: 'user_id',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // -- users --
  {
    table: 'users',
    column: 'created_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
  {
    table: 'users',
    column: 'updated_by',
    refTable: 'users',
    refKey: 'user_id',
    onDelete: 'SET NULL',
    onUpdate: null,
  },
];

export default {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;
    await runInTransaction(queryInterface, async t => {
      for (const fk of FOREIGN_KEYS) {
        const name = constraintName(fk.table, fk.column);
        // Postgres has no ADD CONSTRAINT IF NOT EXISTS. Precheck
        // pg_constraint by name — same pattern as PR #451 for
        // migration 04's invitations_token_unique. Catches the case
        // where migration 04 already installed the constraint (it
        // names them identically).
        const [existing] = await sequelize.query(
          `SELECT 1 FROM pg_constraint WHERE conname = '${name}'`,
          { transaction: t }
        );
        if ((existing as unknown[]).length > 0) {
          continue;
        }
        // Sequelize's `AddForeignKeyConstraintOptions` types `onUpdate`
        // as non-optional `string`. For FKs where the model declares
        // no `onUpdate` AND no `belongsTo` association injects a
        // default, sync() likewise emits no `ON UPDATE` clause —
        // Postgres records this as `NO ACTION` in pg_constraint
        // (confupdtype = 'a'). Passing the explicit string here
        // produces the same `pg_constraint` row, so the normalised
        // pg_dump in DB-A and DB-B match.
        const onUpdate = fk.onUpdate ?? 'NO ACTION';
        await queryInterface.addConstraint(fk.table, {
          fields: [fk.column],
          type: 'foreign key',
          name,
          references: { table: fk.refTable, field: fk.refKey },
          onDelete: fk.onDelete,
          onUpdate,
          transaction: t,
        });
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      for (const fk of FOREIGN_KEYS) {
        await queryInterface
          .removeConstraint(fk.table, constraintName(fk.table, fk.column), { transaction: t })
          .catch(() => {
            // Tolerate missing constraints — partial up() failures or
            // operator-initiated drops shouldn't block rollback.
          });
      }
    });
  },
};
