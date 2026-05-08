# Express 4 → Express 5 Migration Plan

**Linear**: ADS-531 (this document covers the Express portion)
**Status**: Not started — planning only
**Recommended quarter**: After Node 22 migration lands.

> Express 5 went stable on **2024-10-15** after a long beta. The biggest
> structural change is the move from `path-to-regexp` v0 → v8 (route syntax)
> and built-in support for async route handlers (no more `next(err)`
> ceremony). Most of our codebase is already async-aware.

## 1. Current state

Express only runs in `service.backend` — there are **zero** imports of
`express` from any `lib.*` or `app.*` package:

```bash
grep -rE "from ['\"]express['\"]" lib.*/src app.*/src   # 0 hits
grep -rE "from ['\"]express['\"]" service.backend/src   # 82 hits across 82 files
```

Pinned versions (`service.backend/package.json`):

```
"express": "^4.18.2",
"@types/express": "^4.17.17",
"express-validator": "^7.2.1"
```

Adjacent middleware in use:

```
"cookie-parser": "^1.4.7"
"cors":          "^2.8.5"
"helmet":        "^7.0.0"
"morgan":        "^1.10.0"
"multer":        "^2.0.2"
"express-rate-limit" (via middleware/rate-limiter.ts)
```

Surface area:

| Layer | File count |
| --- | --- |
| Routes (`*.routes.ts`) | 26 |
| Controllers | 18 |
| Middleware | 19 |
| Total Express imports | 82 |

Top-level wiring lives in `service.backend/src/index.ts` — 23 `app.use(...)`
mounts plus six health endpoints.

## 2. Breaking changes

References:
- Express 5 release notes — <https://expressjs.com/2024/10/15/v5-release.html>
- Migration guide — <https://expressjs.com/en/guide/migrating-5.html>
- path-to-regexp 8 changelog — <https://github.com/pillarjs/path-to-regexp/blob/master/Readme.md#errors>

| Change | Risk for us | Notes |
| --- | --- | --- |
| **Async errors auto-forwarded** — throwing or rejecting in a handler now propagates to error middleware without `next(err)` | Positive (less code) | We have only 3 manual `next(error)` calls (`grep -E "next\(error\)"` returns 3). After upgrade we can simplify, but it's not required. |
| **`path-to-regexp` v8** — `:param?` no longer supported, splats need `*splat` syntax, regex routes more strict | **Medium** | Need to audit every `router.get/post/...` path. See risk inventory below. |
| **`req.query` is a getter, not a writable property** | Low | We do not assign to `req.query` anywhere (`grep -E "req\.query\s*=" service.backend/src` returns 0). |
| **`res.redirect('back')` removed** — use `res.redirect(req.get('Referrer') ?? '/')` | None | We don't redirect (`grep -E "res\.redirect\(" service.backend/src` returns 0). |
| **`res.send(status)` shorthand removed** — use `res.sendStatus(...)` | Low | All our `res.send/json` calls already pass bodies, not status numbers. |
| **`app.del()` removed** — use `app.delete()` | None | We use `.delete` everywhere. |
| **`req.host` removed** — use `req.hostname` | Low | Not used. |
| **`req.acceptsCharset/Encoding/Language` removed (singular)** | Low | Not used. |
| **`Pluralized` accept methods only** | Low | Not used. |
| **Body parser middleware now built-in (`express.json`/`urlencoded`) raise on invalid JSON instead of silently passing** | Medium | We rely on default behaviour in `index.ts:157,159`. Validation middleware needs to handle the new `SyntaxError` shape from express's body parser. |
| **`express.static` `dotfiles` default changes** | None | Static files not served. |
| **Settings `etag`, `query parser`, `subdomain offset` defaults unchanged** but `trust proxy` semantics tightened | Low | We set `trust proxy = 1` already. |
| **Node ≥ 18 required** | None | Already on Node 20, will be on Node 22. |

## 3. Risk inventory

### 3.1 Route path syntax (highest risk)

`path-to-regexp@8` removes optional `:param?` and changes splat syntax.
Search for at-risk patterns:

```bash
# Optional params
grep -rnE "['\"][^'\"]*:[a-zA-Z]+\?[^'\"]*['\"]" service.backend/src/routes
# Wildcards
grep -rnE "['\"]/[^'\"]*\\*[^'\"]*['\"]" service.backend/src
# Regex routes (RegExp literal as path)
grep -rnE "router\.(get|post|put|patch|delete)\s*\(\s*/" service.backend/src/routes
```

At audit time none of these returned route-pattern hits — the only `*` matches
are inside `express-validator` body paths like `body('overrides.*.role')`,
which is **express-validator** syntax, not Express path syntax. **Good news:
we look clean on this front**, but re-run the searches before the upgrade.

### 3.2 Body-parser error handling

`service.backend/src/index.ts:157,159` mounts:

```ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

Express 5 throws `SyntaxError` for malformed JSON bodies more aggressively.
Our error middleware (`csrfErrorHandler`, `errorHandler` at `index.ts:396,398`)
must classify `SyntaxError` as a 400. Verify the existing error handler does
this; if not, add a small branch.

### 3.3 Async error propagation

Currently we have 3 `next(error)` calls. After Express 5 these can be removed
in favour of plain `throw`, but doing so is **out of scope for the migration
itself** — file as a follow-up cleanup ticket.

### 3.4 `req.params` keys are now numeric strings for `*` matches

Not relevant unless we add a wildcard route post-upgrade.

### 3.5 Adjacent middleware compatibility

- `helmet@7` works on Express 5.
- `cors@2.8.5` works on Express 5 (no API surface from express-internal).
- `morgan@1.10` works.
- `multer@2` is Express-5-aware (v2 was the bump that supported it).
- `express-validator@7.2.1` officially supports Express 5 from v7.0.
- `express-rate-limit` v7+ supports Express 5; check our pin.
- `cookie-parser@1.4.7` works.

Re-verify at upgrade time — bump any middleware that has shipped a v5-aware
release.

## 4. Migration path

**Stage 1 — Preparatory (can happen now, low-risk):**

1. Add a guard test that asserts a malformed JSON body returns 400 with a
   structured error (so we'll catch any error-middleware regression).
2. Confirm the route-path audit (§3.1) is clean and document the result.

**Stage 2 — The bump:**

3. Bump `express` to `^5.x`, `@types/express` to `^5.x`. Re-resolve the
   lockfile.
4. Bump any middleware whose newer major requires Express 5 (likely
   `express-rate-limit`, possibly `cors`).
5. Run the full test suite. Fix typing fallout — most likely `Request`,
   `Response`, `NextFunction` type imports remain unchanged (still exported
   from `'express'`).
6. Smoke-test every route group locally (auth, applications, pets, rescues,
   chat, support, admin, analytics, notifications, monitoring).

**Stage 3 — Cleanup follow-ups (separate PRs):**

7. Remove the 3 `next(error)` calls in favour of throws.
8. Audit for redundant `try/catch` blocks that exist only to forward to
   `next(error)`.

## 5. Effort estimate

- Stage 1 prep: **0.5 dev-day**.
- Stage 2 bump + fix: **2 dev-days** (bulk: re-running tests, chasing typing
  drift, verifying middleware compatibility).
- Stage 3 cleanup: **1 dev-day** (optional, can be deferred indefinitely).

**Total: ~2.5 dev-days for the upgrade itself, ~3.5 with cleanup.**

## 6. Test / rollback plan

**Tests:**

- Full backend Vitest suite (`npx turbo test --filter=@adopt-dont-shop/service-backend`).
- Manual smoke against staging: at minimum one happy-path call per route
  group. The seed script provides enough data for this.
- Specific assertions: malformed JSON body → 400; missing CSRF token → 403;
  unknown route → 404 (Express 5 default-final behaviour).

**Rollback:**

- The change is confined to `service.backend/package.json` + lockfile + a
  small number of code adjustments. A single revert PR restores Express 4.
- No DB schema changes, so rollback has no data implications.

## 7. Prerequisites

- **Node 22 migration (ADS-532)** should land first. Express 5 supports Node
  ≥ 18, but landing the Node bump first avoids confusing "is it Node or
  Express?" failures.
- No DB or model coupling, so independent of Sequelize 7 work.

## 8. Linear follow-up sub-issues to file (titles only)

- `[Deps][Express 5] Add prep test: malformed JSON body returns structured 400`
- `[Deps][Express 5] Re-audit route paths for path-to-regexp v8 syntax (no :param? / no *)`
- `[Deps][Express 5] Bump express, @types/express, and Express-aware middleware`
- `[Deps][Express 5] Cleanup: drop manual next(error) in favour of throws`
- `[Deps][Express 5] Cleanup: remove redundant try/catch wrappers in controllers`
- `[Deps][Express 5] Verify express-validator + helmet + cors + morgan + multer compatibility`
