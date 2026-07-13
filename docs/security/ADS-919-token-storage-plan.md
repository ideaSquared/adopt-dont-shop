# JWT access + refresh token storage — migration plan

> Tracked in [ADS-919](https://linear.app/ideasquared/issue/ADS-919/security-jwt-access-refresh-tokens-persisted-to-localstorage-any-xss-full-persistent-account-takeover).
> Status: **Scoped, not implemented.** See "Why this wasn't implemented directly" below.

## Current state (confirmed on `main` at time of writing)

`AuthService` in `packages/lib.auth/src/services/auth-service.ts` writes both
the access token and the refresh token to `window.localStorage` under
`STORAGE_KEYS.ACCESS_TOKEN` / `STORAGE_KEYS.REFRESH_TOKEN` (defined in
`packages/lib.auth/src/types/auth.ts:268-273`, both prefixed `__dev_*` but
used unconditionally in production builds):

- `setTokens()` (`auth-service.ts:360-365`) — writes both tokens on login/refresh.
- `getToken()` (`auth-service.ts:331-333`) — reads the access token; wired into
  `lib.api`'s `ApiService` via `getAuthToken` (constructor, `auth-service.ts:58-63`)
  so every request attaches `Authorization: Bearer <token>`.
- `logout()` (`:115`) and `refreshToken()` (`:173`) both read the refresh
  token back out of `localStorage` to send to the gateway.
- `packages/lib.auth/src/contexts/AuthContext.tsx` additionally reads/writes
  `STORAGE_KEYS.ACCESS_TOKEN` / `AUTH_TOKEN` directly (dev-mock-auth code
  path, `import.meta.env.DEV` gated, lines ~92-449).
- `apps/rescue/src/pages/Dashboard.tsx:48-51` reads `STORAGE_KEYS.*` directly
  (a "Clear Auth & Restart" escape hatch on a dashboard-load error).
- `apps/rescue/src/services/libraryServices.ts:59-62` and the equivalent in
  `apps/client/src/services/libraryServices.ts` call
  `authService.getToken()` to build the Socket.IO handshake
  `Authorization` header for chat.

`packages/lib.api/src/services/api-service.ts:184` has a comment claiming
"Tokens are now stored in HttpOnly cookies — do not read from localStorage,"
but this only describes the *fallback* path taken when no `getAuthToken` is
configured. `lib.auth`'s constructor always configures it
(`config.getAuthToken: () => this.getToken()`), so in every real app the
fallback is dead code and the actual behaviour is Authorization-header
Bearer auth sourced from `localStorage`. The comment is aspirational, not
descriptive of runtime behaviour.

### What already exists server-side (and what doesn't)

- `services/gateway/src/ws/socket-server.ts:12-18, 272-298` documents and
  implements a fallback that reads an `accessToken` cookie off the raw
  `Cookie` header on a Socket.IO handshake upgrade — **but nothing in the
  codebase ever sets that cookie.** Grepping all of `services/` for
  `setCookie`/`httpOnly`/`HttpOnly` returns only these comment references in
  `socket-server.ts` itself. This is dead/aspirational code, not a partially
  built cookie flow — it does not reduce the size of the migration.
- `services/gateway/src/routes/auth.ts` (login, register, refresh-token,
  logout, redeem-invitation, etc.) never calls `reply.setCookie(...)`. No
  `@fastify/cookie` (or equivalent) plugin is registered anywhere in
  `services/gateway/src`, and it is not a gateway dependency
  (`services/gateway/package.json` has no `cookie` package).
- `packages/lib.api/src/services/api-service.ts:196-252` already implements
  a CSRF-token client (`getCsrfToken()` fetches `GET /api/v1/csrf-token`,
  caches it, and `x-csrf-token` is attached to state-changing requests) —
  **but no `/api/v1/csrf-token` route exists anywhere in `services/`**
  (confirmed by grep across all routes and all services for `csrf`). The
  frontend's CSRF fetch 404s today; the request interceptor swallows that
  failure and proceeds without the header (`api-service.ts:55-60`), and
  nothing server-side currently validates the header either. CSRF
  protection is therefore *client stubbed, not implemented* — a second
  prerequisite this ticket's "Proposed Fix" assumes is already done.
- Access-token TTL is already reasonably short: 15 minutes
  (`services/auth/src/grpc/token-issuer.ts:26`, `ACCESS_TTL_SECONDS`).
  Refresh-token TTL is 30 days (`:27`). Neither is env-configurable (both
  are hardcoded module constants). The 15-minute access TTL is not itself a
  gap worth a follow-up commit — the ticket's actual risk is the 30-day
  refresh token sitting in `localStorage`.

**Net finding:** none of the "already partly exists" infrastructure implied
by the WS comment is actually load-bearing. A real httpOnly-cookie
migration requires building the cookie-setting and CSRF-validation
server-side pieces from scratch, not wiring up something half-built.

## Full auth flow map (login → storage → attach → refresh → logout)

1. **Login** — `AuthService.login()` (`auth-service.ts:68-93`) POSTs
   credentials to `POST /api/v1/auth/login`, gets `{ user, tokens }` back in
   the JSON body, calls `setUser()` + `setTokens()` (both write
   `localStorage`).
2. **Attach to request** — `ApiService`'s request interceptor
   (`api-service.ts:65-72`) calls `config.getAuthToken()` (wired to
   `authService.getToken()`, i.e. `localStorage.getItem(ACCESS_TOKEN)`) and
   sets `Authorization: Bearer <token>` on every request. `credentials:
   'include'` is already set on every `fetch` call
   (`api-service.ts:388`) — this exists for CSRF-cookie delivery, not token
   delivery.
3. **401 handling / refresh** — `ApiService.executeFetch` on a 401 calls a
   registered `refreshHandler` (single-flight, `api-service.ts:399-452`).
   `lib.auth` wires this handler (needs to be located precisely at
   integration time — likely in `AuthContext.tsx` or the `AuthService`
   constructor) to `AuthService.refreshToken()`, which reads the refresh
   token from `localStorage` (`auth-service.ts:173`) and POSTs it to
   `/api/v1/auth/refresh-token`, then re-persists the rotated pair.
4. **WS auth** — `apps/rescue` and `apps/client`'s `libraryServices.ts` wire
   `chatService`'s Socket.IO client to send
   `Authorization: Bearer <token>` (from `authService.getToken()`) on the
   handshake. `socket-server.ts` accepts this via `handshake.auth.token`
   (priority 1) with the (currently unreachable) cookie fallback.
5. **Logout** — `AuthService.logout()` (`:112-124`) reads the refresh token
   from `localStorage`, POSTs it to `/api/v1/auth/logout` for server-side
   revocation, then clears both tokens and the user record from
   `localStorage` regardless of API outcome.
6. **Dev-mock auth** — `AuthContext.tsx` has a parallel, `import.meta.env.DEV`-gated
   mock-login path that also writes `STORAGE_KEYS.ACCESS_TOKEN` /
   `AUTH_TOKEN` plus a `dev_user` key, independent of `AuthService`. Any
   migration must special-case or remove this path too, since it currently
   forges a JS-readable token even in the target design.

## Blast radius — every consumer that needs to change

| Layer | File(s) | Change required |
|---|---|---|
| Gateway | `services/gateway/src/routes/auth.ts` | Add `@fastify/cookie` plugin registration; set `Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Lax; Path=/` (+ refresh cookie, likely `Path=/api/v1/auth/refresh-token` scoped) on login, refresh, register-post-verify, redeem-invitation; clear cookies on logout. |
| Gateway | new route (e.g. `services/gateway/src/routes/csrf.ts`) | Build a real CSRF-token issuance + validation flow (double-submit cookie or synchronizer token) — does not exist today despite the client already speaking to it. |
| Gateway | CORS / cookie config | `SameSite`, `Secure`, `Domain` need to be correct across the three app origins (client/rescue/admin) sharing one gateway — verify they're same-site or this breaks silently. |
| `lib.auth` | `packages/lib.auth/src/services/auth-service.ts` | `getToken()` → return `null` always (or delete); `setTokens()` → no-op for tokens (keep `setUser`); `logout()`/`refreshToken()` stop reading `localStorage` for the refresh token — refresh must become a no-body `POST` relying on the cookie. |
| `lib.auth` | `packages/lib.auth/src/contexts/AuthContext.tsx` | Remove/rework the dev-mock token-in-localStorage path (~9 call sites: lines ~98-449). |
| `lib.auth` | `packages/lib.auth/src/types/auth.ts` | Drop `__dev_*` prefix per ticket; remove `ACCESS_TOKEN`/`REFRESH_TOKEN` from `STORAGE_KEYS` (or keep only `USER`). |
| `lib.api` | `packages/lib.api/src/services/api-service.ts` | Remove the `getAuthToken`/`Authorization` header interceptor path entirely (or make it inert); rely solely on `credentials: 'include'`. Refresh handler must stop passing a `refreshToken` body. |
| `apps/rescue` | `src/services/libraryServices.ts` (chat Socket.IO wiring) | Stop sending `Authorization: Bearer <token>` on the WS handshake; rely on the cookie riding along on the upgrade request (this is the one place the existing `socket-server.ts` cookie-fallback code becomes load-bearing instead of dead). |
| `apps/client` | equivalent `libraryServices.ts` | Same WS change. |
| `apps/rescue` | `src/pages/Dashboard.tsx:48-51` | Direct `STORAGE_KEYS.ACCESS_TOKEN` read/remove needs updating or deleting (the key will no longer exist). |
| `packages/lib.chat` | `src/services/chat-service.ts` | Confirm/adjust however it consumes the `headers.Authorization` callback from each app. |
| All three apps | login/logout/refresh call sites, any component checking `isAuthenticated()`/`getToken()` | `isAuthenticated()` currently requires `!!this.getToken()` (`auth-service.ts:164-166`) — with `getToken()` always `null`, this must change to something else (e.g. a lightweight `/auth/me` probe or a non-HttpOnly "logged-in" marker cookie the JS *can* read, which is the standard pattern for this exact problem). |
| Tests | `packages/lib.auth/src/__tests__/auth-service.test.ts`, `AuthContext.test.tsx`, and any MSW-based frontend tests asserting `localStorage` token state | All need rewriting to assert cookie-based behaviour instead (can't inspect httpOnly cookies from JS in tests either — needs supertest/playwright-level assertions server-side, and "absence of the token in JS" assertions client-side). |
| E2E | Playwright suite (`/e2e`) | New spec per acceptance criteria: injected `<script>` cannot exfiltrate tokens; CSRF-missing mutation returns 403; refresh survives reload with no JS-visible token. |

This is **8+ files across 2 backend surfaces (gateway route logic +
brand-new CSRF subsystem) and 3 frontend packages, touching all three
React apps' auth-dependent code paths (login, refresh, logout, WS
handshake, "am I logged in" checks) simultaneously**, because the access
token is used for both REST Authorization headers and WS handshake auth
today, and `isAuthenticated()` cannot keep its current implementation once
`getToken()` stops being readable.

## CSRF implications

Moving to cookie-based auth makes the app vulnerable to CSRF on
state-changing endpoints unless enforced correctly (the browser now attaches
credentials automatically to any cross-site form/fetch that reaches the
gateway's origin). The client already assumes a CSRF token exists
(`x-csrf-token` header, double-submit-cookie shaped client code) but:

- No server-side CSRF route or verification middleware exists today —
  this must be built, not just "connected."
- The design needs to decide: synchronizer-token pattern (server session
  state) vs. double-submit cookie (stateless, matches what the client
  already half-implements) — double-submit is the natural fit given the
  existing client code, and needs a `SameSite`-cookie-readable CSRF value
  (not HttpOnly) alongside the HttpOnly access/refresh cookies.
- `SameSite=Lax` is expressed as the target cookie attribute in the
  ticket's acceptance criteria — `Lax` alone does not fully stop CSRF on
  simple `GET`-with-side-effects requests (this codebase's REST API is
  correctly all POST/PUT/PATCH/DELETE for mutations, so `Lax` + CSRF token
  should be sufficient, but this must be verified, not assumed).

## Target design (high level)

1. Gateway sets `accessToken` and `refreshToken` as `HttpOnly; Secure;
   SameSite=Lax` cookies on `/auth/login`, `/auth/refresh-token`,
   `/auth/register` (post-verify), `/auth/redeem-invitation`; clears them on
   `/auth/logout`. `refreshToken` cookie scoped to `Path=/api/v1/auth` to
   limit its blast radius if a non-auth endpoint is compromised.
2. Gateway implements a real CSRF double-submit: issues a non-HttpOnly
   `csrfToken` cookie plus validates the `x-csrf-token` header matches it on
   every state-changing request (the client-side half of this already
   exists in `api-service.ts` and just needs a working server side).
3. `lib.auth` stops persisting tokens in JS-reachable storage. `setTokens`
   becomes a no-op for tokens; `getToken()` is removed (or hard-coded
   `null`) and `Authorization` header attachment is deleted from
   `ApiService`. `isAuthenticated()` is redefined around a `GET /auth/me`
   probe or a small non-HttpOnly "session present" marker cookie set
   alongside the HttpOnly ones (JS-readable, holds no secret, just a
   boolean-ish flag so the SPA can render the right UI without an extra
   round-trip on every page load).
4. `apiService` requests drop the `Authorization` header entirely and rely
   on `credentials: 'include'` (already present).
5. WS handshakes drop the JS-supplied `Authorization`/`auth.token` value and
   rely on the cookie riding along on the upgrade request — this activates
   the currently-dead fallback path in `socket-server.ts` rather than adding
   new server logic there.
6. One-time migration: on first post-deploy load, `lib.auth` init clears any
   pre-existing `__dev_access_token` / `__dev_refresh_token` keys from
   `localStorage` (even though they'll no longer be written) so a
   previously-compromised device's copy is inert client-side; server-side,
   forcing global refresh-token invalidation on deploy (or accepting old
   tokens will simply expire within 30 days) is a rollout decision, not a
   code change.

## Phased rollout plan

1. **Phase 0 — CSRF foundation** (backend only, independently shippable):
   build the real `/api/v1/csrf-token` issuance route + validation
   middleware in the gateway. Low risk: the client already sends the
   header when present, so this is additive and testable in isolation
   before any cookie-auth work starts. Ship and verify 403-on-missing/bad
   token in production traffic first.
2. **Phase 1 — Gateway sets cookies alongside existing body tokens**: add
   `Set-Cookie` on login/refresh/etc. *without* removing `tokens` from the
   JSON body yet. Both mechanisms live side by side; no frontend change
   required yet. Verify cookies show up correctly (Secure/HttpOnly/SameSite,
   correct domain) across all three app origins in a staging environment.
3. **Phase 2 — Frontend cutover, one app at a time**: pick the lowest-traffic
   app first (likely `apps/admin`), switch its `lib.auth`/`lib.api` usage to
   cookie-only, redefine `isAuthenticated()`, drop the WS
   `Authorization` header for that app's chat usage (`admin` may not use
   chat — check), and land + soak before repeating for `apps/rescue` then
   `apps/client`. Since `lib.auth`/`lib.api` are shared packages, this
   likely needs a feature flag or config switch rather than true per-app
   staging unless the interceptor behaviour is made conditional — flag this
   as a design decision for whoever picks up implementation.
4. **Phase 3 — Remove body tokens**: once all three apps are cutover and
   soaked, stop returning `tokens` in the login/refresh JSON body server-side
   and delete the dead `Authorization`-header code paths client-side.
5. **Phase 4 — Cleanup**: drop `__dev_*` prefix from any remaining storage
   keys, remove dead WS-cookie-fallback comments (now literally true),
   update `services/gateway/src/ws/socket-server.ts` comments to match
   reality, and delete the dev-mock-auth localStorage token path in
   `AuthContext.tsx` or rebuild it to also go through cookies.

## Test strategy

- **Gateway**: extend `services/gateway/src/routes/auth.test.ts` to assert
  `Set-Cookie` headers (attributes: `HttpOnly`, `Secure`, `SameSite`, `Path`)
  on login/refresh/register/redeem-invitation/logout(-clear); add
  `csrf.test.ts` covering token issuance and 403 on missing/mismatched
  header on a representative mutation route.
- **`lib.auth`**: rewrite `auth-service.test.ts` and `AuthContext.test.tsx`
  to assert `localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)` is never
  called/never returns a value, and that `isAuthenticated()` works off the
  new mechanism (mock the `/auth/me` probe or marker cookie).
- **`lib.api`**: assert no `Authorization` header is attached to outgoing
  requests once the token-header code path is removed; assert CSRF header
  attachment still works against the new real gateway route.
- **Per-app**: update any component/page test that stubs `localStorage`
  tokens directly (e.g. `apps/rescue/src/pages/Dashboard.test.tsx` if it
  exists) and the two `libraryServices.ts` WS wiring points.
- **E2E (Playwright)**: new spec(s) matching the ticket's acceptance
  criteria directly — inject a `<script>` on a rendered page and assert it
  cannot read `document.cookie` for the auth cookies nor exfiltrate a token
  via any DOM/global; verify refresh works across a full page reload with
  zero JS-visible token at any point; verify a mutation request without
  the CSRF header gets 403.

## Why this wasn't implemented directly

This ticket's own "Proposed Fix" section assumes cookie-setting and CSRF
enforcement are one-line changes ("gateway sets tokens as cookies," "CSRF
token (already present)"). Investigation shows **neither exists
server-side today** — the WS-handshake cookie comment describes a fallback
that nothing feeds, and the CSRF client code talks to a route that 404s.
Building both from scratch, then migrating three apps' login/refresh/logout/
WS-auth/`isAuthenticated()` code paths off `localStorage` simultaneously
(because the same `getToken()` call is shared by REST headers and WS
handshakes), is an architecturally significant, multi-PR change — not a
same-day contained fix. Per this task's instructions, that scope calls for
a scoping document and explicit follow-up ticket(s) for Phases 0-4 above,
not a partial implementation landed directly against `main`.

**Recommended immediate next step:** file Phase 0 (real CSRF
issuance/validation in the gateway) as its own ticket — it's genuinely
contained, backend-only, and additive, and is a hard prerequisite for every
later phase.
