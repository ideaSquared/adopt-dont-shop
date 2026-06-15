import type { MigrationBuilder } from 'node-pg-migrate';

// GDPR erasure anonymises content authorship by NULLing author_id (and
// last_modified_by). author_id was created NOT NULL, so eraseCms would
// hit a constraint violation. Drop the NOT NULL so erasure can blank it.
// last_modified_by was already nullable.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.alterColumn('cms_content', 'author_id', { notNull: false });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.alterColumn('cms_content', 'author_id', { notNull: true });
};
