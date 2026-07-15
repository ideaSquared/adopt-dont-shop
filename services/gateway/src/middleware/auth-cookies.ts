// httpOnly access/refresh token cookies (ADS-919 Phase 1+).
//
// Replaces the Bearer-token-in-JSON-body model: routes/auth.ts sets the
// token pair as Set-Cookie headers on login/refresh-token and clears them
// on logout, instead of returning them in the response body. Neither
// cookie is JS-readable — the SPA never sees the raw tokens, so an XSS on
// any of the three apps can no longer exfiltrate them via
// `localStorage`/`document.cookie`.
//
// authenticate.ts reads ACCESS_TOKEN_COOKIE_NAME as a fallback to the
// Authorization header. middleware/csrf.ts checks for its presence to
// decide whether a state-changing request is "authenticated" (and
// therefore must carry a valid CSRF token). ws/socket-server.ts already
// reads the same cookie name off the raw handshake Cookie header — this
// module is the REST-side counterpart, kept in sync by using the same
// literal name.
//
// A fourth, non-HttpOnly `hasSession` cookie rides alongside the two
// HttpOnly ones so the SPA (lib.auth's AuthService.isAuthenticated()) can
// synchronously answer "is someone logged in" without a network round trip
// and without ever exposing the real tokens — it carries no secret, just a
// presence flag.
//
// TTLs mirror services/auth/src/grpc/token-issuer.ts's ACCESS_TTL_SECONDS /
// REFRESH_TTL_SECONDS (15 minutes / 30 days, both fixed constants there
// too). Not imported directly — the gateway and service.auth don't share
// that module — so keep these in sync by hand if either changes.

import type { FastifyReply, FastifyRequest } from 'fastify';

export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
export const SESSION_COOKIE_NAME = 'hasSession';

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Scoped to the auth surface so a compromised non-auth endpoint (an XSS
// gadget hitting the wrong route, a vulnerable proxy rule, etc.) can't read
// the refresh token off the request even if it could somehow reach cookies
// server-side. The access-token cookie stays at Path=/ — every route needs
// it for authentication.
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};

// Only Secure over an actual HTTPS request — dev/test run over plain HTTP,
// and a Secure cookie is silently dropped by the browser there. Same check
// routes/csrf.ts already uses for the CSRF cookie.
const isSecureRequest = (req: FastifyRequest): boolean => req.protocol === 'https';

/** Sets the httpOnly access/refresh cookies + the JS-readable session marker. */
export const setAuthCookies = (
  req: FastifyRequest,
  reply: FastifyReply,
  tokens: AuthTokenPair
): void => {
  const secure = isSecureRequest(req);

  reply.setCookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    path: REFRESH_TOKEN_COOKIE_PATH,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
  reply.setCookie(SESSION_COOKIE_NAME, '1', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
};

/** Clears all three auth cookies — called on logout regardless of upstream outcome. */
export const clearAuthCookies = (req: FastifyRequest, reply: FastifyReply): void => {
  const secure = isSecureRequest(req);

  reply.clearCookie(ACCESS_TOKEN_COOKIE_NAME, { path: '/', secure, sameSite: 'lax' });
  reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    path: REFRESH_TOKEN_COOKIE_PATH,
    secure,
    sameSite: 'lax',
  });
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/', secure, sameSite: 'lax' });
};

export const extractAccessTokenFromCookie = (req: FastifyRequest): string | undefined =>
  req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

export const extractRefreshTokenFromCookie = (req: FastifyRequest): string | undefined =>
  req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
