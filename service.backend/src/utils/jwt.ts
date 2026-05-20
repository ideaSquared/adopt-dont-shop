import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AccessTokenPayload = {
  userId: string;
  email: string;
  userType?: string;
  role?: string;
  rescueId?: string;
  jti?: string;
  iat?: number;
  exp?: number;
};

/**
 * Verify an access token's signature and expiry. Pins the algorithm to
 * HS256 so a future asymmetric-key code path can't be exploited via the
 * `alg: HS256` confusion attack (where the public key is used as the
 * HMAC secret). Shared by `middleware/auth.ts` and the Socket.IO
 * handshake / per-event revalidation so the two transports stay in
 * lockstep.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}
