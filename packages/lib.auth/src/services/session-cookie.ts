// ADS-919: the gateway sets a small, non-HttpOnly `hasSession` cookie
// alongside the real HttpOnly access/refresh token cookies on login/refresh
// (see services/gateway/src/middleware/auth-cookies.ts), and clears it on
// logout. It carries no secret — just a presence flag — so
// AuthService.isAuthenticated() can answer "is someone logged in"
// synchronously, without a network round trip and without ever touching
// the real tokens (which JS can't read at all).

const SESSION_COOKIE_NAME = 'hasSession';

/** True when the gateway's non-HttpOnly session marker cookie is present. */
export const hasSessionCookie = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.cookie
    .split(';')
    .some((entry) => entry.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
};

/**
 * Clears the JS-visible session marker so isAuthenticated() flips to false
 * immediately (e.g. after a 401, or on logout) without waiting on a network
 * round trip. The real HttpOnly access/refresh cookies can only be cleared
 * server-side (Set-Cookie on /auth/logout).
 */
export const clearSessionCookie = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; path=/`;
};
