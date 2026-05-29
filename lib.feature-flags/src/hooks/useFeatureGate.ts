import { StatsigContext } from '@statsig/react-bindings';
import { useContext } from 'react';
import { KnownGate } from '../types';

/**
 * Module-level set of gate names that have already emitted the
 * "Statsig not initialized" warning. Keeps the warning to at most once
 * per gate name per page load rather than on every render.
 *
 * Exported for test teardown only — production code should not call this.
 */
export const _warnedGatesForTesting = new Set<string>();
const warnedGates = _warnedGatesForTesting;

/**
 * Hook to check if a feature gate is enabled
 *
 * @example
 * ```tsx
 * import { useFeatureGate, KNOWN_GATES } from '@adopt-dont-shop/lib.feature-flags';
 *
 * function MyComponent() {
 *   const { value: isEnabled } = useFeatureGate(KNOWN_GATES.ENABLE_REAL_TIME_MESSAGING);
 *
 *   return isEnabled ? <ChatFeature /> : <ComingSoon />;
 * }
 * ```
 */
export const useFeatureGate = (gateName: KnownGate | string): { value: boolean } => {
  const { client } = useContext(StatsigContext);

  if (!client) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && !warnedGates.has(gateName)) {
      warnedGates.add(gateName);
      console.warn(
        `[useFeatureGate] Statsig client not initialized, returning false for gate: ${gateName}`
      );
    }
    return { value: false };
  }

  return { value: client.checkGate(gateName) };
};
