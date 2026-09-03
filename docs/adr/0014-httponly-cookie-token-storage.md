# ADR 0014 — HttpOnly cookie token storage (ADS-919)

- Status: Accepted — implemented
- Date: 2026-08-28
- Scope: `services/gateway` auth/CSRF middleware and the SPA auth client
  (`packages/lib.auth`, `packages/lib.api`)
- Linear: ADS-919
- Supersedes / Superseded by: —

## Context

The SPA needs to hold an access token and a refresh token across requests.
Storing either in `localStorage` or JS-readable cookies makes it readable by any
script on the page, so a single XSS turns into full session theft with no
server-side revocation possible for the stolen access token.

## Decision

Tokens live in cookies the browser sends automatically and JavaScript cannot
read:

- The gateway sets `accessToken` and `refreshToken` as **HttpOnly** cookies
  (`services/gateway/src/middleware/auth-cookies.ts`). The SPA never sees the
  token values.
- A fourth, **non-HttpOnly** `hasSession` marker cookie rides alongside so the
  SPA (`AuthService.isAuthenticated()`) can tell whether a session exists
  without reading a credential.
- CSRF is a **double-submit cookie**: `GET /api/v1/csrf-token`
  (`services/gateway/src/routes/csrf.ts`) issues a non-HttpOnly `csrfToken`
  cookie and returns the same value in the body; `lib.api` echoes it as the
  `x-csrf-token` header on every state-changing request, and
  `services/gateway/src/middleware/csrf.ts` compares header against cookie in
  constant time. Enforcement covers any request carrying either cookie.

`localStorage` was rejected: it is readable by any script (XSS = token exfil),
is not sent automatically, and cannot be made HttpOnly. Cookie storage keeps the
credential out of JS reach and lets the server clear/rotate it on logout.

## Consequences

Mutations depend on the double-submit handshake, so the CSRF route must stay
publicly reachable (login/register are unauthenticated but still POST). The
`hasSession` marker is advisory only — the HttpOnly cookies remain the
authority the gateway checks.
