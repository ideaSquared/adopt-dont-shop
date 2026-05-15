# @adopt-dont-shop/lib.legal

Legal re-acceptance modal, cookie banner, and consent service shared by every frontend app. Centralises the user-facing flows around our Terms of Service, Privacy Policy, and Cookies Policy so the three apps don't drift out of sync.

## What it ships

### Components

- **`LegalReacceptanceModal`** — hard-blocks the app after login when the current ToS / Privacy version is newer than what the user last accepted. Mount it once near the root of `app.client`, `app.admin`, and `app.rescue`. Non-dismissable; the user must tick each pending document and submit before continuing.
- **`CookieBanner`** + `useCookieConsent` — bottom-anchored on-page banner that lets the user pick **Accept all** (analytics on) or **Essentials only** (analytics off, the default). Persists the choice in `localStorage` (`legal-consent-v1`) and, for signed-in users, POSTs it to `/api/v1/privacy/consent` so the audit log captures it.
- **`ManageCookiesLink`** — small footer link that re-opens the banner so users can change their mind later.

### Service

`legal-service` is a thin Zod-validated wrapper around three backend endpoints:

- `fetchPendingReacceptance()` → `GET /api/v1/legal/pending-reacceptance`
- `fetchCookiesVersion()` → `GET /api/v1/legal/cookies` (just the version string)
- `recordReacceptance(input)` → `POST /api/v1/privacy/consent`

`PendingReacceptanceItemSchema`, `PendingReacceptanceResponseSchema`, and the corresponding `z.infer<>` types are exported so callers can compose on top.

### Cookie-consent storage helpers

- `readStoredConsent()` / `writeStoredConsent()` / `clearStoredConsent()` — typed access to the `legal-consent-v1` localStorage entry (`StoredCookieConsentSchema` validates it).
- `attachStoredCookieConsent()` — call this on first sign-in to replay an anonymous user's locally-stored choice against their account.
- `COOKIE_CONSENT_STORAGE_KEY` is exported in case a consumer needs to clear it directly.

## Quick start

```tsx
import {
  LegalReacceptanceModal,
  CookieBanner,
  ManageCookiesLink,
} from '@adopt-dont-shop/lib.legal';

export const AppShell = () => (
  <>
    <LegalReacceptanceModal />
    <CookieBanner />
    <Routes>{/* … */}</Routes>
    <Footer>
      <ManageCookiesLink />
    </Footer>
  </>
);
```

On sign-in flows, call `attachStoredCookieConsent()` after authentication completes so anonymous consent is migrated to the new account.

## Dependencies

Workspace packages: `lib.api`, `lib.auth`, `lib.components`, `lib.observability`. The banner flips the analytics consent gate in `lib.observability` so Sentry replay / Statsig auto-capture respect the choice on the same tab without a reload.

## Development

```bash
npx turbo build --filter=@adopt-dont-shop/lib.legal
npx turbo test  --filter=@adopt-dont-shop/lib.legal
npx turbo lint  --filter=@adopt-dont-shop/lib.legal
```

Or from `lib.legal/`: `npm run build`, `npm test`, `npm run lint`.

## See also

- [docs/legal/cookies.md](../docs/legal/cookies.md) — cookies-policy copy and category definitions
- [docs/legal/privacy.md](../docs/legal/privacy.md) — privacy policy
- [docs/legal/terms.md](../docs/legal/terms.md) — terms of service
- [`lib.observability`](../lib.observability/README.md) — the analytics-consent gate the banner toggles
