import type { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // No-op today. Each spec cleans up resources it creates via the `api` fixture.
  // Reserved for future global cleanup (e.g. resetting feature flags toggled during a run).
}
