import type { MigrationBuilder } from 'node-pg-migrate';

// Access-token revocation watermark.
//
// Access tokens are short-lived JWTs that ValidateToken only denies on a
// per-jti denylist + active-status check. Session revocation and password
// reset/change revoke the REFRESH tokens but leave already-issued access
// tokens usable until their natural expiry (up to the access TTL).
//
// tokens_valid_from is a per-user watermark: when set, ValidateToken rejects
// any access token whose `iat` predates it. Revoke-session / reset / change
// stamp it to now(), immediately invalidating outstanding access tokens.
// NULL (the default) means "no watermark" — the common case — so the column
// adds nothing to the hot path for users who've never revoked.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('users', {
    tokens_valid_from: { type: 'timestamptz' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('users', 'tokens_valid_from');
};
