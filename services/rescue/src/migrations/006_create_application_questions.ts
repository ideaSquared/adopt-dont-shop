import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_questions.
//
// Direct port of service.backend's 00-baseline-022-application-questions.ts
// INTO the `rescue` schema. Rescue-configurable adoption questionnaire
// rows — core questions (scope='core', rescue_id=NULL) form the shared
// baseline; rescue_specific rows override or extend per rescue.
//
// Three ENUMs (scope, category, question_type). The DB-level partial
// unique indexes enforce: (question_key, rescue_id) is unique among
// non-deleted rows AND core questions have a globally unique
// question_key (rescue_id IS NULL there).
//
// rescue_id is INTRA-schema FK → rescues (ON DELETE CASCADE — a deleted
// rescue takes its custom questions with it; the core rows stay).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('application_question_scope', ['core', 'rescue_specific']);
  pgm.createType('application_question_category', [
    'personal_information',
    'household_information',
    'pet_ownership_experience',
    'lifestyle_compatibility',
    'pet_care_commitment',
    'references_verification',
    'final_acknowledgments',
  ]);
  pgm.createType('application_question_type', [
    'text',
    'email',
    'phone',
    'number',
    'boolean',
    'select',
    'multi_select',
    'address',
    'date',
    'file',
  ]);

  pgm.createTable('application_questions', {
    question_id: { type: 'uuid', primaryKey: true },
    rescue_id: {
      type: 'uuid',
      references: 'rescues(rescue_id)',
      onDelete: 'CASCADE',
    },
    question_key: { type: 'varchar(100)', notNull: true },
    scope: { type: 'application_question_scope', notNull: true },
    category: { type: 'application_question_category', notNull: true },
    question_type: { type: 'application_question_type', notNull: true },
    question_text: { type: 'text', notNull: true },
    help_text: { type: 'text' },
    placeholder: { type: 'varchar(255)' },
    options: { type: 'text[]' },
    validation_rules: { type: 'jsonb' },
    display_order: { type: 'integer', notNull: true, default: 0 },
    is_enabled: { type: 'boolean', notNull: true, default: true },
    is_required: { type: 'boolean', notNull: true, default: false },
    conditional_logic: { type: 'jsonb' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('application_questions', 'rescue_id', {
    name: 'application_questions_rescue_id_idx',
  });
  pgm.createIndex('application_questions', 'scope', {
    name: 'application_questions_scope_idx',
  });
  pgm.createIndex('application_questions', 'category', {
    name: 'application_questions_category_idx',
  });
  pgm.createIndex('application_questions', 'question_type', {
    name: 'application_questions_type_idx',
  });
  pgm.createIndex('application_questions', 'is_enabled', {
    name: 'application_questions_enabled_idx',
  });
  pgm.createIndex('application_questions', 'display_order', {
    name: 'application_questions_order_idx',
  });
  // Per-rescue uniqueness on the question_key (excluding soft-deleted
  // rows). Core rows (rescue_id IS NULL) get the looser uniqueness via
  // the second partial-unique below.
  pgm.createIndex('application_questions', ['question_key', 'rescue_id'], {
    name: 'application_questions_key_rescue_unique',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('application_questions', 'question_key', {
    name: 'application_questions_core_key_unique',
    unique: true,
    where: "scope = 'core' AND deleted_at IS NULL",
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_questions');
  pgm.dropType('application_question_scope');
  pgm.dropType('application_question_category');
  pgm.dropType('application_question_type');
};
