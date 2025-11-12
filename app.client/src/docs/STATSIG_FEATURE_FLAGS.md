# Statsig Feature Flags Integration

This document explains how to use Statsig feature flags directly in your React components.

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

- `pdf_viewer_enabled` - Controls PDF preview functionality in chat
- `image_lightbox_enabled` - Controls image lightbox/modal functionality
- `chat_attachments_enabled` - Controls chat attachment features

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

```tsx
const { getDynamicConfig } = useStatsig();

const config = getDynamicConfig('app_settings');
const maxFileSize = config?.get('max_upload_size_mb', 10) || 10;
const apiTimeout = config?.get('api_timeout_ms', 5000) || 5000;
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

- **MessageBubbleComponent**: Shows PDF viewer and image lightbox feature gates
- **StatsigFeatureExample**: Demonstrates all Statsig features in one component

## Migration from Static Features

Old way (features.ts):

```tsx
import { FEATURES } from '@/config/features';

{
  FEATURES.PDF_VIEWER_ENABLED && <PDFViewer />;
}
```

New way (Statsig):

```tsx
import { useStatsig } from '@/hooks/useStatsig';

const { checkGate } = useStatsig();
{
  checkGate('pdf_viewer_enabled') && <PDFViewer />;
}
```

## Troubleshooting

- **Gates always return false**: Check if Statsig client is initialized and gates are created in console
- **TypeScript errors**: Make sure you're importing from the correct path
- **Performance concerns**: `checkGate()` calls are cached and optimized by Statsig

For more information, see the [Statsig React documentation](https://docs.statsig.com/client/jsClientSDK).
