import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_documents.
//
// Document METADATA rows for files attached to an application. The file
// bytes live in object storage — the gateway owns the multipart upload
// and writes the stored URL here; this table only references it. Mirrors
// the SPA's Document shape (id, applicationId, type, filename, url,
// uploadedAt, size?, mimeType?).
//
// application_id / uploaded_by are cross-schema soft pointers
// (applications.applications / auth.users) — no DB REFERENCES per the
// schema-per-service rule. Soft-delete via deleted_at so removals leave
// an audit trail and don't cascade.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_documents', {
    document_id: { type: 'uuid', primaryKey: true },
    application_id: { type: 'uuid', notNull: true },
    type: { type: 'text', notNull: true },
    filename: { type: 'text', notNull: true },
    url: { type: 'text', notNull: true },
    size: { type: 'integer' },
    mime_type: { type: 'text' },
    uploaded_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('application_documents', 'application_id', {
    name: 'application_documents_application_id_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_documents');
};
