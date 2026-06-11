# @adopt-dont-shop/lib.observability

Frontend observability helpers shared by `app.client`, `app.admin`, and `app.rescue`. Wraps Sentry init, a Web Vitals reporter, and the analytics-consent gate so the three apps don't reimplement them.

## What it ships

### Sentry

- `initSentry(options: SentryInitOptions)` — initialise Sentry for one app. Safe to call when `dsn` is empty (logs a warning, skips). Sentry is classified as **strictly necessary** for service reliability and runs unconditionally — do **not** gate it on `hasAnalyticsConsent()`. Replay sample rates default to `0` so identifiable session content stays off until callers explicitly opt in.
- `captureException(error, context?)` / `captureMessage(message, level?)` — thin re-exports of `@sentry/react`.
- `SentryInitOptions` type covers DSN, app name (`'admin' | 'client' | 'rescue'`), environment, release, trace sample rate, and replay sample rates.

### Web Vitals

- `reportWebVitals(reporter)` — subscribes to CLS, INP, LCP, TTFB, and FCP via the `web-vitals` package and forwards each measurement to the supplied reporter. Designed to be called once during app bootstrap.
- `WebVitalMetric` / `WebVitalsReporter` types describe the payload (name, value, rating, id, delta).

### Analytics consent gate

A minimal localStorage-backed switch for analytics SDKs (Statsig auto-capture, session replay). Sentry is **out of scope** for this gate — see above.

- `hasAnalyticsConsent(): boolean` — read current state (defaults to denied / `false`).
- `setAnalyticsConsent('granted' | 'denied' | 'unknown')` — write the choice. `'unknown'` clears storage. Dispatches an `ads:analytics-consent-change` custom event so same-tab listeners can react immediately (the native `storage` event only fires across tabs).
- `subscribeToAnalyticsConsent(listener)` — subscribe to consent changes; returns an unsubscribe function. Listens to both the custom event and the cross-tab `storage` event.
- `ANALYTICS_CONSENT_STORAGE_KEY` — the localStorage key (`ads:analytics-consent`), exported for tests and direct clearing.

## Quick start

```ts
// In each app's entry point (e.g. app.client/src/main.tsx):
import {
  initSentry,
  reportWebVitals,
  hasAnalyticsConsent,
} from '@adopt-dont-shop/lib.observability';

initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  appName: 'client',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_BUILD_SHA,
});

reportWebVitals((metric) => {
  // ship to wherever — Sentry metrics, /api/v1/web-vitals, console, …
  console.log(metric.name, metric.value, metric.rating);
});

// Later, in an analytics SDK bootstrap:
if (hasAnalyticsConsent()) {
  initStatsigAutoCapture();
}
```

The cookie banner in [`lib.legal`](../lib.legal/README.md) calls `setAnalyticsConsent` for you when the user picks **Accept all** / **Essentials only**.

## Development

```bash
npx turbo build --filter=@adopt-dont-shop/lib.observability
npx turbo test  --filter=@adopt-dont-shop/lib.observability
npx turbo lint  --filter=@adopt-dont-shop/lib.observability
```

Or from `lib.observability/`: `npm run build`, `npm test`, `npm run lint`.

## See also

- [`lib.legal`](../lib.legal/README.md) — cookie banner that owns the consent UI and toggles this gate
- [`docs/legal/cookies.md`](../docs/legal/cookies.md) — cookie category definitions; explains why Sentry is exempt
- [`docs/observability-alerting.md`](../docs/observability-alerting.md) — how Sentry events feed alerting
