import type { MigrationBuilder } from 'node-pg-migrate';

// BEFORE INSERT/UPDATE trigger that keeps messages.search_vector in
// lockstep with the row's content column. Replaces the monolith's
// afterSync hook (`installGeneratedSearchVector` in
// service.backend/src/models/generated-search-vector.ts) — the DB owns
// the invariant here so there's no JS hook to bypass on raw INSERT /
// UPDATE / COPY paths.
//
// Why a trigger instead of a stored generated column: to_tsvector is
// STABLE (not IMMUTABLE) because the result depends on the active
// text-search configuration. Postgres rejects non-IMMUTABLE
// expressions in `GENERATED ALWAYS AS (...) STORED`. The BEFORE
// trigger sidesteps that constraint and produces the same end-state.
//
// The 'english' config matches the monolith's expression exactly (see
// service.backend/src/models/Message.ts:328) so search behaviour ports
// without surprise.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english', coalesce(NEW.content, ''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER messages_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content ON messages
    FOR EACH ROW
    EXECUTE FUNCTION messages_search_vector_update();
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('DROP TRIGGER IF EXISTS messages_search_vector_trigger ON messages;');
  pgm.sql('DROP FUNCTION IF EXISTS messages_search_vector_update();');
};
