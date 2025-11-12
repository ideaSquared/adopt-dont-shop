# @adopt-dont-shop/lib-feature-flags

Simplified feature flag library providing type definitions and constants for Statsig integration.

## Overview

This library has been refactored to support Statsig-only feature flag management. It provides:

- TypeScript type definitions for gates and dynamic configs
- Constants for known feature gates
- Type-safe config shapes for admin settings

## Migration

**This library no longer contains a backend feature flag service.** All feature flags are now managed through Statsig.

See [STATSIG_MIGRATION.md](../../STATSIG_MIGRATION.md) in the root directory for migration details.

## Usage

### In React Apps

Use `@statsig/react-bindings` directly in your app:

```typescript
import { useGate, useDynamicConfig } from '@statsig/react-bindings';
import { KNOWN_GATES, KNOWN_CONFIGS } from '@adopt-dont-shop/lib-feature-flags';

// Check a feature gate
const { value: isEnabled } = useGate(KNOWN_GATES.ENABLE_REAL_TIME_MESSAGING);

// Get dynamic config
const config = useDynamicConfig(KNOWN_CONFIGS.APPLICATION_SETTINGS);
const maxApps = config.get('max_applications_per_user', 5);
```

### In Backend (Node.js)

Use `statsig-node` SDK:

```typescript
import Statsig from 'statsig-node';
import { KNOWN_GATES } from '@adopt-dont-shop/lib-feature-flags';

// Initialize once at startup
await Statsig.initialize(process.env.STATSIG_SERVER_SECRET_KEY);

// Check a gate
const isEnabled = await Statsig.checkGate(
  { userID: userId },
  KNOWN_GATES.ENABLE_REAL_TIME_MESSAGING
);
```

## Known Gates

The library exports a `KNOWN_GATES` constant with all defined feature gates:

```typescript
export const KNOWN_GATES = {
  ENABLE_REAL_TIME_MESSAGING: 'enable_real_time_messaging',
  ENABLE_ADVANCED_SEARCH: 'enable_advanced_search',
  ENABLE_NOTIFICATION_CENTER: 'enable_notification_center',
  ENABLE_APPLICATION_WORKFLOW: 'enable_application_workflow',
  ENABLE_CONTENT_MODERATION: 'enable_content_moderation',
  UI_SHOW_BETA_FEATURES: 'ui_show_beta_features',
  FEATURE_SOCIAL_SHARING: 'feature_social_sharing',
  ENABLE_ANALYTICS_TRACKING: 'enable_analytics_tracking',
  ALLOW_BULK_OPERATIONS: 'allow_bulk_operations',
  FEATURE_RATING_SYSTEM: 'feature_rating_system',
} as const;
```

## Known Configs

The library exports a `KNOWN_CONFIGS` constant with all defined dynamic configs:

```typescript
export const KNOWN_CONFIGS = {
  APPLICATION_SETTINGS: 'application_settings',
  SYSTEM_SETTINGS: 'system_settings',
  MODERATION_SETTINGS: 'moderation_settings',
} as const;
```

## TypeScript Types

### Config Shapes

The library provides strongly-typed interfaces for each dynamic config:

```typescript
import type { ApplicationSettingsConfig } from '@adopt-dont-shop/lib-feature-flags';

const config = useDynamicConfig(KNOWN_CONFIGS.APPLICATION_SETTINGS);

// TypeScript knows the shape:
const settings: ApplicationSettingsConfig = {
  max_applications_per_user: config.get('max_applications_per_user', 5),
  auto_approve_verified_rescues: config.get('auto_approve_verified_rescues', false),
  maintenance_mode: config.get('maintenance_mode', false),
  new_registrations_enabled: config.get('new_registrations_enabled', true),
  adoption_approval_workflow_enabled: config.get('adoption_approval_workflow_enabled', true),
};
```

## Development

```bash
# Build
npm run build

# Type check
npm run type-check

# Run tests
npm test
```

## License

MIT
