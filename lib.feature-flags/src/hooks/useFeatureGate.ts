import { StatsigContext } from '@statsig/react-bindings';
import { useContext } from 'react';
import { KnownGate } from '../types';

/**
 * Hook to check if a feature gate is enabled
 *
 * @example
 * ```tsx
 * import { useFeatureGate, KNOWN_GATES } from '@adopt-dont-shop/lib-feature-flags';
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
    console.warn(
      `[useFeatureGate] Statsig client not initialized, returning false for gate: ${gateName}`
    );
    return { value: false };
  }

  return { value: client.checkGate(gateName) };
};
