# Statsig Feature Flags Integration

This document explains how to use Statsig feature flags directly in your React components.

## Preferred hook: `useFeatureGate`

For a simple on/off gate, use `useFeatureGate` from `@adopt-dont-shop/lib.feature-flags`. **It
returns an object `{ value: boolean }`, not a bare boolean** — destructure it, or the gate reads as
permanently on:

```tsx
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';

function MyComponent() {
  const { value: enabled } = useFeatureGate('advanced_search_filters');
  return enabled ? <AdvancedFilters /> : <BasicFilters />;
}
```

Use the `useStatsig` hook below only as the imperative escape hatch — when you also need to log
events or fetch experiments alongside a gate check.

## Quick Start

### 1. Import the hook

```tsx
import { useStatsig } from '@/hooks/useStatsig';
```

### 2. Use feature gates

```tsx
function MyComponent() {
  const { checkGate, logEvent } = useStatsig();

  // Check if a feature is enabled
  const showNewFeature = checkGate('new_feature_enabled');

  return (
    <div>
      {showNewFeature && (
        <div>
          <h2>New Feature!</h2>
          <button onClick={() => logEvent('new_feature_used')}>Use Feature</button>
        </div>
      )}
    </div>
  );
}
```

## Available Feature Gates

### Currently Used Gates:

- `advanced_search_filters` — toggles the advanced filter UI in `SearchPage`
- `new_hero_design` — toggles the new hero variant in `HomePage`

These two are passed as string literals to `useFeatureGate(...)` and are the only gates evaluated in
the client today. The `KNOWN_GATES` catalogue in `@adopt-dont-shop/lib.feature-flags` currently has
10 entries and **zero call sites** across `apps/*/src` — treat it as a placeholder catalogue of
platform-wide gate names, not deployed gates. If you add a gate that appears there, prefer the
constant.

### Setting up new gates in Statsig Console:

1. Go to your Statsig console
2. Navigate to "Feature Gates"
3. Create new gates with descriptive names
4. Set targeting rules (user groups, rollout percentage, etc.)
5. Use the gate names in your code with `checkGate()`

## Advanced Usage

### Experiments (A/B Testing)

```tsx
const { getExperiment } = useStatsig();

const buttonExperiment = getExperiment('button_color_test');
const buttonColor = buttonExperiment?.get('color', 'blue') || 'blue';

return <button style={{ backgroundColor: buttonColor }}>Click me</button>;
```

### Dynamic Configuration

The real dynamic configs are `application_settings`, `system_settings`, and `moderation_settings`
(`KNOWN_CONFIGS` in `@adopt-dont-shop/lib.feature-flags`). Prefer the `useConfigValue` hook:

```tsx
import { useConfigValue, KNOWN_CONFIGS } from '@adopt-dont-shop/lib.feature-flags';

const maxFileSize = useConfigValue(KNOWN_CONFIGS.SYSTEM_SETTINGS, 'max_file_upload_size_mb', 10);
```

`apps/admin/src/pages/Configuration.tsx` is the live example. The imperative `useStatsig` form is:

```tsx
const { getDynamicConfig } = useStatsig();
const config = getDynamicConfig('system_settings');
const maxFileSize = config?.get('max_file_upload_size_mb', 10) || 10;
```

### Event Logging

```tsx
const { logEvent } = useStatsig();

// Simple event
logEvent('button_clicked');

// Event with value
logEvent('file_uploaded', fileSize);

// Event with metadata
logEvent('feature_used', 1, {
  feature_name: 'pdf_viewer',
  user_type: 'premium',
  file_size: '2.5MB',
});
```

## Best Practices

1. **Use descriptive gate names**: `pdf_viewer_enabled` instead of `feature_1`
2. **Always provide fallbacks**: Use default values for experiments and configs
3. **Log feature usage**: Track when features are used for analytics
4. **Test both states**: Ensure your app works with features on AND off
5. **Group related flags**: Use prefixes like `chat_*`, `admin_*`, etc.

## Examples in the Codebase

- **`SearchPage.tsx`** — `useFeatureGate('advanced_search_filters')` toggles the advanced filter UI.
- **`HomePage.tsx`** — `useFeatureGate('new_hero_design')` swaps the hero variant.

Prefer the `useFeatureGate` / `useDynamicConfig` hooks from `@adopt-dont-shop/lib.feature-flags` for new code; the `useStatsig` hook is the imperative escape hatch for places that need to log events or fetch experiments alongside a gate check.

## Troubleshooting

- **Gates always return false**: Check if Statsig client is initialized and gates are created in console
- **TypeScript errors**: Make sure you're importing from the correct path
- **Performance concerns**: `checkGate()` calls are cached and optimized by Statsig

For more information, see the [Statsig React documentation](https://docs.statsig.com/client/jsClientSDK).
