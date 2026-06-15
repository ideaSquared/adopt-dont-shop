# Frontend & Shared-Libraries Code-Quality Review

A pass over the areas the two backend `services/*` reviews did not touch: the
three React apps (`app.admin`, `app.client`, `app.rescue`) and the shared
`packages/lib.*` libraries. Each area was audited independently for security,
correctness, data, accessibility and type-safety. Genuine defects were fixed
in place with tests; defense-in-depth / policy / pre-existing-dead-code items
are catalogued below rather than changed.

## Fixed

| Package | Fix | Severity |
|---|---|---|
| lib.auth | Logout/updateProfile read the literal `'accessToken'`/`'authToken'` localStorage keys, but the setters write under `STORAGE_KEYS.ACCESS_TOKEN`/`AUTH_TOKEN` (`__dev_*`) — so dev-token cleanup never ran and the updateProfile dev short-circuit was dead. Use the constants. (dev-only) | Med |
| lib.validation | `PhoneNumberSchema` stripped separators then only checked length, so a non-numeric 10–20 char string passed despite the "digits" message. Added a digit charset regex. | Med |
| lib.components | `Toast`/`ToastContainer` had no `role`/`aria-live`, so screen-reader users got no announcement on success/error feedback (used on live admin pages). Added `status`/`polite` (info/success) and `alert`/`assertive` (error/warning). | High (a11y) |
| lib.components | `MetricCard` currency format hardcoded USD/runtime locale in a UK GBP app → `en-GB`/`GBP`. (latent — no live caller yet) | Med |
| lib.components | `SelectInput` label `htmlFor` pointed at an id no element carried; added the id to `Select.Trigger` so the label focuses the control. | Low (a11y) |
| app.admin | `UserActionsMenu` confirm handler had a `try/finally` with no `catch`, so a rejected destructive action (delete/suspend/reset) left the modal open with no feedback and an unhandled rejection. Now catches, surfaces the error in an `alert`, and stays open. | High |
| app.admin | `useDashboardAnalytics` query key `['dashboard-analytics', …]` sat in a sibling namespace the realtime `useAnalyticsInvalidator` (`['analytics', cat]`) could never match, so the dashboard never refreshed on `analytics:invalidate`. Moved into the `['analytics', 'dashboard', …]` namespace. | Med |
| app.client | `ProfileEditForm` validated the postcode with a US ZIP regex (`\d{5}(-\d{4})?`), rejecting every valid UK postcode and blocking UK adopters from saving their profile. Switched to the UK postcode pattern. | High |
| app.client | "Browse Pets" CTAs linked to `/pets`, which is not a route (only `/pets/:id`) — both landed on the 404 page. Pointed at `/search`. | Med |

## Verified sound (no change needed)

- **Auth/token security (lib.api/lib.auth):** access/refresh tokens are in httpOnly cookies (not localStorage), `getBaseUrl()` is `''` in-browser so requests stay same-origin (no cross-origin Bearer leak), CSRF tokens are single-flight cached, and the 401 refresh-and-retry uses a correct single-flight promise with no refresh loop.
- **UI authorization gating (lib.auth / lib.permissions / lib.feature-flags):** `PermissionGate`, `PermissionsContext`, `usePlan`/`PlanGate`, and the Statsig flag hooks all **fail closed** — they deny / default-off while permissions or flags are loading or errored. No flash-of-privileged-UI.
- **rescueId scoping (app.rescue / app.admin):** read endpoints are server-scoped (no client-chosen rescueId); staff-write path params derive from the user's own staff record. No cross-rescue access vector found.
- **React Query keys / forms (app.admin):** reviewed hooks include all queryFn params and invalidate correctly; modals guard double-submit; Broadcast carries a per-send idempotency key.
- **lib.components primitives:** `Modal` (focus trap/restore/escape/scroll-lock), `Table`/`DataTable`/`Pagination` (sort + clamping, no off-by-one), and Radix-backed dropdowns/selects/tooltips are correct.

## Deferred (defense-in-depth / policy / pre-existing — not changed)

| Area | Item | Why deferred |
|---|---|---|
| app.rescue | `PlanGate` has zero production usage — plan-restricted features (Analytics/Reports `growth`+, custom questions `professional`-only) render ungated | Backend enforces plan limits; wrapping routes is an entitlement-UX policy decision spanning several pages |
| app.rescue | `PetManagement` renders create/edit/delete controls without a `useHasPermission` gate (other pages gate theirs) | Defense-in-depth only — backend enforces; UI-gating policy |
| app.rescue | `/reports` reachable by direct URL despite nav-hiding; `as` casts in pet submit | Backend-enforced; low impact |
| app.admin | `SendEmailModal` can POST `{ templateId: undefined }` on a template lookup miss | Latent — `selectedTemplate` is constrained to known ids today |
| app.admin | Realtime refresh of dashboard analytics also needs the backend to emit a `dashboard` category | Backend change, out of app scope |
| lib.validation | Local `EmailSchema` in `rescue.ts`/`application.ts` bypasses the canonical NFKC/single-script normalization; over-permissive UK postcode regex + stale "mirrors backend" comment | Low impact (homograph defense-in-depth); regex tightening risks false-rejects |
| lib.api / lib.components | Dead code: unused `cache` field + `clearCache()` in api-service; unexported `en-US` `utils/date.ts` & `utils/currency.ts`; unrendered `EditUserModal` | Pre-existing dead code — flagged, not deleted (per repo convention) |
| app.client | `useApplicationDraft` shows "Failed to save draft" on a load failure; module-singleton chat/search caches not cleared on logout (no cross-user leak — keys are id-scoped) | Low / cosmetic |

**Verification:** `turbo lint type-check test` for the touched packages (lib.auth, lib.validation, lib.components, app.admin, app.client) — all green.
