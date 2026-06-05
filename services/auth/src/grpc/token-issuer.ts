// Production TokenIssuer implementation backed by jsonwebtoken.
//
// Mint short-lived access tokens + longer-lived refresh tokens, signed
// with separate secrets (config.jwtSecret + config.jwtRefreshSecret) so
// a leaked access secret doesn't compromise refresh.
//
// Token lifetimes match the monolith:
//   - access:  15m
//   - refresh: 30d
//
// `jti` is a random UUID per token — used by the Logout / RefreshToken
// denylist (auth.revoked_tokens.jti) so revoking a token doesn't
// require keeping the full token text around.

import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';

import type {
  AccessTokenClaims,
  MintedTokens,
  RefreshTokenClaims,
  TokenIssuer,
} from './handlers.js';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export type TokenIssuerConfig = {
  accessSecret: string;
  refreshSecret: string;
};

export function createJwtTokenIssuer(cfg: TokenIssuerConfig): TokenIssuer {
  return {
    mint: async userId => {
      const now = Math.floor(Date.now() / 1000);
      const accessJti = randomUUID();
      const refreshJti = randomUUID();

      const accessExp = now + ACCESS_TTL_SECONDS;
      const refreshExp = now + REFRESH_TTL_SECONDS;

      const accessToken = jwt.sign(
        { sub: userId, jti: accessJti, iat: now, exp: accessExp },
        cfg.accessSecret
      );
      const refreshToken = jwt.sign(
        { sub: userId, jti: refreshJti, iat: now, exp: refreshExp },
        cfg.refreshSecret
      );

      const minted: MintedTokens = {
        pair: {
          accessToken,
          refreshToken,
          accessExpiresAt: new Date(accessExp * 1000).toISOString(),
          refreshExpiresAt: new Date(refreshExp * 1000).toISOString(),
        },
        accessJti,
        accessExpiresAt: new Date(accessExp * 1000),
        refreshJti,
        refreshExpiresAt: new Date(refreshExp * 1000),
      };
      return minted;
    },

    verifyAccess: async token => {
      const decoded = jwt.verify(token, cfg.accessSecret) as Record<string, unknown>;
      return toAccessClaims(decoded);
    },

    verifyRefresh: async token => {
      const decoded = jwt.verify(token, cfg.refreshSecret) as Record<string, unknown>;
      return toRefreshClaims(decoded);
    },
  };
}

function toAccessClaims(raw: Record<string, unknown>): AccessTokenClaims {
  const sub = typeof raw.sub === 'string' ? raw.sub : undefined;
  const jti = typeof raw.jti === 'string' ? raw.jti : undefined;
  const iat = typeof raw.iat === 'number' ? raw.iat : undefined;
  const exp = typeof raw.exp === 'number' ? raw.exp : undefined;
  if (!sub || !jti || iat === undefined || exp === undefined) {
    throw new Error('access token missing required claims');
  }
  return { sub, jti, iat, exp };
}

function toRefreshClaims(raw: Record<string, unknown>): RefreshTokenClaims {
  const sub = typeof raw.sub === 'string' ? raw.sub : undefined;
  const jti = typeof raw.jti === 'string' ? raw.jti : undefined;
  const iat = typeof raw.iat === 'number' ? raw.iat : undefined;
  const exp = typeof raw.exp === 'number' ? raw.exp : undefined;
  if (!sub || !jti || iat === undefined || exp === undefined) {
    throw new Error('refresh token missing required claims');
  }
  return { sub, jti, iat, exp };
}
