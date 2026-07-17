import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-963: Fix 2FA enable() trusting client-supplied secret.
//
// Previously, setupTwoFactor minted a secret and returned it to the client
// without persisting it. enableTwoFactor then accepted req.secret from the
// caller and verified a TOTP code against *that* secret — meaning an attacker
// with a temporary access token could supply their own secret, lock the victim
// out with a permanent second factor, and survive a password reset.
//
// Fix: store the setup secret server-side with a short TTL. enableTwoFactor
// reads from the DB instead of trusting the client.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('users', {
    two_factor_secret_pending: { type: 'text' },
    two_factor_pending_expires_at: { type: 'timestamptz' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumns('users', ['two_factor_secret_pending', 'two_factor_pending_expires_at']);
};
