/**
 * Canonical "kick every active session for this user" helper. Combines
 * the three knobs the platform uses to force a re-auth:
 *
 *   1. Set `users.tokens_invalid_before = NOW()` so the auth middleware
 *      rejects any access token whose `iat` predates this call (covers
 *      the 15-min stale-JWT window even if the access token survived
 *      the refresh-token revocation below).
 *   2. Revoke every active refresh-token row for the user so the next
 *      `/auth/refresh` call falls into the reuse-detection branch
 *      instead of minting a new access token.
 *   3. Disconnect every live Socket.IO connection for the user so a
 *      stale WebSocket can't keep emitting past the credential change.
 *
 * Used by credential-change events (password reset, 2FA enable, 2FA
 * disable, 2FA recovery). NOT used by `updateUserRole` — a role change
 * is a softer event: the User model's `beforeUpdate` hook bumps
 * `tokens_invalid_before` automatically and the frontend re-fetches its
 * role-gated state via the `auth:role-changed` socket event without
 * tearing down the WebSocket or forcing a re-login.
 */
import type { Transaction } from 'sequelize';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { disconnectAllSockets } from '../socket/socket-registry';
import { invalidateAuthCache } from './auth-cache';

export async function invalidateUserTokens(
  userId: string,
  transaction?: Transaction
): Promise<{ refreshTokensRevoked: number }> {
  await User.update({ tokensInvalidBefore: new Date() }, { where: { userId }, transaction });

  const [refreshTokensRevoked] = await RefreshToken.update(
    { is_revoked: true },
    { where: { user_id: userId, is_revoked: false }, transaction }
  );

  invalidateAuthCache(userId);
  disconnectAllSockets(userId);

  return { refreshTokensRevoked };
}
