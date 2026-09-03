# ADR 0006 — Field-level permission enforcement (ADS-1037)

- Status: Partially implemented (partial rollout — see Scope shipped below)
- Date: 2026-08-04
- Scope: `packages/authz`, `packages/lib.types` (field-permission-defaults),
  `services/rescue`
- Linear: ADS-1037
- Supersedes / Superseded by: —

## Context

ADS-1037 found that the field-level permission system was fully built as a
_configuration_ surface — the `field_permissions` DB table, its migration,
the auth service's gRPC CRUD handlers, the gateway REST routes, the 1100-line
`lib.types` default policy, and the admin `FieldPermissions` editor page all
exist and work — but nothing read that configuration when serving a real
request. `fieldMask` and `fieldWriteGuard`, the enforcement middleware every
comment in `field-permission-defaults.ts` referred to, did not exist anywhere
in the repository. An operator setting a field to `none` in the admin UI saw
it persist and reasonably believed the field was hidden; it was not.

The ticket named two options: implement enforcement, or remove the feature
(admin page, routes, gRPC handlers, config) as a smaller, honest fix.

## Decision

**Implement enforcement (Option A)** — not remove it. The configuration
surface (defaults + DB overrides) is sound and the admin UI is genuinely
useful once something reads it; removing it would throw away real design
work to fix a wiring gap. What was missing is a shared, testable mechanism
plus the discipline to call it at each service's serialisation boundary.

## What was built

`@adopt-dont-shop/authz` gained three pure, unit-tested primitives:

- `resolveFieldAccessMap(resource, roles, overrides?)` — three stages, in
  order: (1) unions a principal's role(s) against the `lib.types`
  defaults, most-permissive role wins per field, matching how
  `loadPrincipal` already unions plain permissions; (2) an admin-supplied
  `overrides` map, when present, takes PRECEDENCE over that union per
  field — it replaces the level rather than taking the more permissive of
  the two, so an override can both loosen a field the role default denies
  AND RESTRICT a field the role default grants (e.g. a role's `write`
  overridden to `none`). This is deliberately not most-permissive-wins:
  the Field Permissions admin UI exists to let an operator tighten access,
  and a union there would make it unable to ever do so; (3) the
  sensitive-field denylist is re-applied last so neither a role default
  nor an override can ever loosen a hard-denied field.
- `fieldMask(payload, accessMap)` — read-side response masking. Strips any
  key whose resolved level isn't `read`/`write`, including keys absent
  from the map (secure by default).
- `fieldWriteGuard(body, accessMap)` — write-side request guard. Rejects
  the whole write (not a partial apply) if any supplied field isn't
  `write`-level, returning the blocked field names.

These are generic — they operate on plain objects, not on any one
resource's proto shape — so any service can adopt them.

## Scope shipped now

**`services/rescue`** is the one resource wired end-to-end in this PR:

- `getRescue` / `listRescues` apply `fieldMask` to the `Rescue` proto
  before returning it.
- `updateRescue` applies `fieldWriteGuard` to the fields the request
  actually supplies, before any SQL is built.
- Enforcement runs inside the gRPC handler (services/rescue), not the
  gateway, so a direct gRPC caller can't bypass it — verified by tests
  that call the handlers directly (`services/rescue/src/grpc/handlers.test.ts`,
  `describe('field-level permission enforcement (ADS-1037)')`).
- The `rescues` block in `field-permission-defaults.ts` was corrected to
  match the real `Rescue` proto (`settings` → `settingsJson`; added
  `plan`, `planExpiresAt`, `version`, which the proto has and the old
  config didn't) — necessary so masking a real `GetRescue` response
  doesn't drop fields the config had simply never been told about.

`rescues` was chosen as the first resource because it was the only one of
the four where the `lib.types` defaults' field names already matched (or,
after the correction above, now match) the real proto returned by the
owning service. See "Why not the other three resources yet" below.

## What was NOT done (and why)

**`applications`, `users`, `pets` are not enforced yet.** Auditing the
other three resources' `rowToProto()` / `stateToProto()` output against
their `field-permission-defaults.ts` blocks surfaced that all three
predate the microservices split and describe the deleted monolith's
Sequelize shape, not the current one:

- **`applications`**: `services/applications` is event-sourced.
  `GetApplication` returns `stateToProto()`
  (`services/applications/src/grpc/state-mapper.ts`), whose fields
  (`applicationId`, `answersJson`, `decisionNotes`, `homeVisitNotes`, …)
  mostly don't match the config's keys (`id`, `data`, `reviewNotes`,
  `notes`, `tags`, `score`, …). Applying `fieldMask` across the whole
  object as configured today would strip `applicationId`, `adopterId`,
  `petId`, `status` and most other fields for every role — a severe
  regression, not a fix. **`documents` is not a field on `Application` at
  all** — it's returned by the separate `ListDocuments` RPC
  (`services/applications/src/grpc/document-handlers.ts`), so the ticket's
  literal acceptance-criterion scenario ("`applications.documents` set to
  `none` for `support_agent` causes `GetApplication` to omit `documents`")
  cannot be reproduced against the current schema without adding a new
  proto field. Separately, `ListDocuments`' existing ownership/rescue
  scope check already returns `PERMISSION_DENIED` to `moderator` /
  `support_agent` for any application they don't own or aren't rescue
  staff of — an unrelated, pre-existing RBAC scoping gap (support agents
  can't reach that RPC at all today, regardless of field permissions) that
  ADS-1037 did not create and this PR does not change.
- **`users`**: the config lists fields (`phoneNumber`, `dateOfBirth`,
  `addressLine1`, …) that don't match `rowToProtoUser()`
  (`services/auth/src/grpc/handlers.ts`) — some exist on a different
  handler (`account-handlers.ts`'s `updateAccount`), most don't exist on
  the read path at all. `updateAccount` is also always self-service (a
  user editing their own record); the config's per-role write levels
  (e.g. `moderator.firstName: 'read'`) were written for a staff-editing-
  another-user scenario the current gRPC surface doesn't have as a single
  generic endpoint — wiring `fieldWriteGuard` onto self-edit as-is would
  incorrectly block moderators/support agents/rescue staff from editing
  their own name.
- **`pets`**: `services/pets` already does its own ad hoc field hiding
  (`medicalNotes`/`behavioralNotes` gated behind an `includeInternalNotes`
  flag, nested inside a JSON `extraJson` blob) that doesn't line up with
  the config's flat per-field model, and several configured fields
  (`microchipId`, `surrenderReason`, `trainingNotes`, …) aren't on the
  current proto/row at all.

Rather than ship a broad change that silently drops real fields on three
resources under time pressure, this PR ships the core mechanism — fully
tested — plus one resource enforced correctly end-to-end, and documents
the other three as a follow-up audit. The comments at the top of each
resource block in `field-permission-defaults.ts` now say this explicitly
(`NOT YET AUDITED...`) so the next person wiring one of them starts from
an honest baseline instead of the config's word.

**DB override layering is not wired to a live source.** `resolveFieldAccessMap`
accepts an optional `overrides` parameter and is tested against it, but no
caller supplies one yet — doing so needs either a direct query against
`services/auth`'s `field_permissions` table (only `services/auth` has it)
or a cross-service gRPC call from the other services to auth's existing
`ListFieldPermissionOverridesForRole` RPC, plus a short-TTL cache so it
isn't a per-request query. Both are real, scoped follow-up work, not
included here.

## Follow-up (tracked as future work, not in this PR)

1. Audit `users` / `applications` / `pets` field-permission-defaults
   against their services' real proto shapes (same exercise done for
   `rescues` in this PR) and wire `fieldMask` / `fieldWriteGuard` into
   each once corrected.
2. Wire `resolveFieldAccessMap`'s `overrides` parameter to a real source
   (auth DB query in-service, or a gRPC call + cache from other services)
   so admin-configured overrides actually take effect.
3. Decide the self-edit vs. staff-edit-another-user semantics for `users`
   before wiring `updateAccount` / `AdminUpdateUser` — the current config
   assumes two separate endpoints where the live surface has one.
4. Separately: `services/applications`' `ListDocuments` blocks `moderator`
   / `support_agent` entirely via ownership scope — worth a look as a
   distinct RBAC ticket if those roles are meant to view any application's
   documents for support purposes.
