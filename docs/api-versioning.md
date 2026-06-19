# API Versioning & Deprecation (ADS-820)

How the Adopt Don't Shop REST API is versioned, what counts as a breaking
change, and the lifecycle a route follows from deprecation to sunset. The
contract this document governs is the gateway's public REST surface — the
single `/api/v1/*` edge served by `services/gateway`, described by the
OpenAPI document the gateway generates from its route schemas (served as
JSON at `/openapi.json` and browsable at `/docs`).

> Scope: the public REST API only. The internal gRPC contracts between the
> gateway and the extracted services are versioned separately by the proto
> package (`adopt_dont_shop.<domain>.v1`) and are not a public surface.

## Versioning scheme

- The API is versioned **in the URL path**: `/api/v<N>/`.
- **Every route is currently on `v1`** (`/api/v1/...`). There is no `v2` yet.
- The version is a single integer that increments only when a backwards-
  incompatible change cannot be avoided. It is **not** tied to the generated
  spec's OpenAPI `info.version` — that tracks spec revisions; the path
  version tracks the wire contract.
- A new major version is introduced **side-by-side**: `/api/v2/*` routes are
  added while `/api/v1/*` continues to serve until its sunset date. We do not
  reuse a version number after it is retired.

## What counts as a breaking change

Aligned with the OpenAPI document — a change is **breaking** if an existing
client written against the current spec could stop working. Concretely:

- Removing a route, or removing a supported method on a route.
- Removing a response field, or changing its type / format / nullability.
- Removing or renaming an enum value a response can return.
- Adding a **required** request field, or making an existing optional field
  required.
- Removing a previously-accepted request field or query parameter.
- Tightening validation (narrower length / range / pattern) on an existing
  field.
- Changing the success status code, or the error-body shape, for an existing
  outcome.
- Changing authentication / authorization requirements for an existing route
  (e.g. a route that was public now requires a token).

**Non-breaking** (additive — ship in the current version):

- Adding a new route or a new method on a route.
- Adding an **optional** request field or query parameter.
- Adding a new response field (clients must ignore unknown fields).
- Adding a new enum value to a request field the server already tolerates, or
  to a response field where clients are documented to tolerate unknowns.
- Relaxing validation (wider range, looser pattern).

When in doubt, treat it as breaking. The cost of a needless version bump is
lower than the cost of silently breaking a client.

## Deprecation lifecycle

A route or field moves through four states. The default deprecation window is
**6 months** between "deprecated" and "sunset" — long enough for first-party
apps (`app.client`, `app.rescue`, `app.admin`) and any external integrator to
migrate. Shorten it only with sign-off, and only when no external client is
affected; lengthen it for widely-used routes.

| State | Meaning | Client impact |
| --- | --- | --- |
| **Active** | Supported, no replacement planned. | None. |
| **Deprecated** | Still works; a replacement exists; removal scheduled. | `Deprecation` + `Sunset` headers on every response; `deprecated: true` in OpenAPI. |
| **Sunset** | Past the sunset date; may be removed at any time. | Route is removed; calls return `404`. |
| **Removed** | Gone. | `404`. |

### `Deprecation` and `Sunset` response headers (RFC 8594)

Once a route is deprecated, the gateway attaches two headers to every response
from it, per [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594):

```http
Deprecation: Sat, 01 Aug 2026 00:00:00 GMT
Sunset: Mon, 01 Feb 2027 00:00:00 GMT
Link: </docs/api-versioning.md>; rel="deprecation"; type="text/markdown"
```

- `Deprecation` — an HTTP-date for when the route became deprecated (RFC 8594
  also permits the bare token `true`; we prefer the dated form so clients can
  reason about age).
- `Sunset` — an HTTP-date for the earliest removal, per
  [RFC 8594 §3](https://www.rfc-editor.org/rfc/rfc8594). With a 6-month
  window, `Sunset = Deprecation + 6 months`.
- `Link … rel="deprecation"` — points clients at this document for the
  migration path.

Clients should monitor for these headers in CI / runtime logs and surface them
to engineers (e.g. log a warning on any response carrying a `Sunset` header).

### OpenAPI annotation

A deprecated route is marked in the route's `schema` annotation in the
gateway, which `@fastify/swagger` surfaces in the generated document so the
change is visible in `/docs` and any generated SDK:

```ts
server.get(
  '/api/v1/old-thing',
  {
    schema: {
      deprecated: true,
      description:
        'Deprecated 2026-08-01, sunset 2027-02-01. Use /api/v1/new-thing. See docs/api-versioning.md.',
    },
  },
  handler
);
```

`deprecated: true` is the canonical machine-readable signal; the headers above
are its runtime counterpart. Keep the two in sync.

## The deprecation process

1. **Decide.** Confirm the change is breaking (see the definition above). If
   it is additive, just ship it — no version bump, no deprecation.
2. **Land the replacement first.** The new route/field must be live and
   documented before the old one is deprecated, so clients have somewhere to
   go.
3. **Record the decision in an ADR.** Add an entry under
   [`docs/adr/`](./adr/) following the existing format (see
   [ADR 0002](./adr/0002-applications-strangler-cutover.md)). The ADR states
   what is being deprecated, the replacement, the timeline (deprecation date +
   sunset date), and the migration steps. Link it from this document and from
   the OpenAPI `description`.
4. **Mark it deprecated.** Set `deprecated: true` in the route's `schema`
   annotation in the gateway (it flows into the generated spec), wire the
   `Deprecation` / `Sunset` / `Link` headers on the route, and add the dates
   to the route's `description`.
5. **Announce.** Note the deprecation in the commit using a conventional
   commit `BREAKING CHANGE:` footer so it surfaces in the changelog:

   ```
   feat(api): add /api/v1/new-thing replacing /api/v1/old-thing

   BREAKING CHANGE: /api/v1/old-thing is deprecated (sunset 2027-02-01).
   Migrate to /api/v1/new-thing. See docs/api-versioning.md.
   ```

   The footer documents intent and timeline; the route itself keeps working
   until its sunset date — deprecation is not removal.
6. **Wait out the window.** Keep the deprecated route serving for the full
   6-month (default) window. Watch its request volume; do not remove it while
   it still has meaningful traffic from clients you cannot reach.
7. **Sunset.** After the sunset date, and once traffic has fallen to zero (or
   only reaches clients you've explicitly written off), remove the route. The
   removal commit references the ADR.

### When the whole version turns over

A new path version (`/api/v2/`) is reserved for the rare case where breaking
changes are too pervasive to deprecate route-by-route. The same process
applies at the version level: stand up `/api/v2/*` alongside `/api/v1/*`,
deprecate `v1` with `Deprecation` / `Sunset` headers and an ADR, run the
6-month window, then retire `v1`.

## Quick checklist

- [ ] Change confirmed breaking (else: ship additively, stop here).
- [ ] Replacement route/field live and documented.
- [ ] ADR written under `docs/adr/` with deprecation + sunset dates.
- [ ] `deprecated: true` set in the route's `schema` annotation; dates in the `description`.
- [ ] `Deprecation` + `Sunset` + `Link` headers wired in the gateway.
- [ ] Conventional commit carries a `BREAKING CHANGE:` footer.
- [ ] Calendar reminder set for the sunset date.
