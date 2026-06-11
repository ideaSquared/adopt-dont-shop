import type { MigrationBuilder } from 'node-pg-migrate';

// Align refresh_tokens with the columns the gRPC handlers actually use.
//
// 006 ported the monolith's table shape (token_id PK, family_id rotation
// chains, is_revoked flag), but the extracted handlers (login / refresh /
// logout / sessions insert path) were written against a different contract:
// they INSERT (token, user_id, expires_at, revoked_at, ...) and look tokens
// up by the raw `token` value. Against a real database every login failed
// with 42703 undefined_column — unit tests never caught it because they
// mock the pool (found by the e2e probe on PR #1011).
//
// This is the minimal additive alignment so the running handlers work:
//   - `token` + `revoked_at` columns the handlers read/write
//   - defaults for `token_id` and `family_id`, which the handlers omit
//
// Known degradation, accepted for now: with a per-row family_id default,
// each refresh token forms its own rotation family, so the sessions list
// groups per-token rather than per-chain. The proper rework (handlers
// adopting token_id/family_id semantics) belongs with the ADS-801 auth
// rework.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('refresh_tokens', {
    token: { type: 'text' },
    revoked_at: { type: 'timestamptz' },
  });
  pgm.createIndex('refresh_tokens', 'token', {
    name: 'refresh_tokens_token_uq',
    unique: true,
  });
  pgm.alterColumn('refresh_tokens', 'token_id', {
    default: pgm.func('gen_random_uuid()'),
  });
  pgm.alterColumn('refresh_tokens', 'family_id', {
    default: pgm.func('(gen_random_uuid())::text'),
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.alterColumn('refresh_tokens', 'family_id', { default: null });
  pgm.alterColumn('refresh_tokens', 'token_id', { default: null });
  pgm.dropIndex('refresh_tokens', 'token', { name: 'refresh_tokens_token_uq' });
  pgm.dropColumns('refresh_tokens', ['token', 'revoked_at']);
};
