# @adopt-dont-shop/lib.analytics

User-engagement tracking and reporting. Wraps the backend analytics API with a queued, batched event sink plus helpers for metrics, reports, conversion funnels, and A/B test results.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.analytics": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list. The primary entry points:

- **`AnalyticsService`** — configurable class. Construct with a `Partial<AnalyticsServiceConfig>` and (optionally) an `ApiService` from `@adopt-dont-shop/lib.api`.
- **Types** — `AnalyticsServiceConfig`, plus event and report types re-exported from `./types` (`UserEngagementEvent`, `PageViewEvent`, `UserJourney`, `EngagementMetrics`, `SystemPerformanceMetrics`, `AnalyticsReport`, `ReportParams`, `ReportType`, `ConversionFunnel`, `ABTestResults`, `AnalyticsQueryOptions`, `TimeRange`).

### Key methods on `AnalyticsService`

Tracking (queued and flushed in batches):

- `trackEvent(event)` — record a `UserEngagementEvent`
- `trackPageView(pageView)` — record a `PageViewEvent`
- `trackUserJourney(journey)`
- `trackConversion(event, value?)`
- `trackError(error, context?)`
- `trackTiming(category, variable, time, label?)`

Reporting:

- `getEngagementMetrics(range, options?)`
- `getSystemPerformance(range)`
- `generateReport(type, params)`
- `getConversionFunnel(params)`
- `getABTestResults(testId)`

Lifecycle / config:

- `getConfig()` / `updateConfig(updates)`
- `getSessionId()` / `startNewSession()`
- `healthCheck()`
- `destroy()` — flush the queue and stop the internal timer

## Quick start

```typescript
import { AnalyticsService } from '@adopt-dont-shop/lib.analytics';

const analytics = new AnalyticsService({
  provider: 'internal',
  autoTrackPageViews: true,
  sampleRate: 100,
  debug: import.meta.env.DEV,
});

await analytics.trackEvent({
  category: 'pet_discovery',
  action: 'swipe_like',
  label: petId,
  sessionId: analytics.getSessionId(),
});

const metrics = await analytics.getEngagementMetrics({ start: from, end: to });
```

## Scripts (from `lib.analytics/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # jest
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
- Service implementation: [src/services/analytics-service.ts](./src/services/analytics-service.ts)
