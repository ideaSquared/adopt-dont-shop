import { StatsigContext } from '@statsig/react-bindings';
import { useCallback, useContext } from 'react';

/**
 * Custom hook to access Statsig client and common functionality for feature flags
 * and event logging. For gates and dynamic configs in components, prefer `useFeatureGate`
 * and `useDynamicConfig` from `lib.feature-flags`.
 *
 * @example
 * ```tsx
 * import { useStatsig } from '@/hooks/useStatsig';
 *
 * function MyComponent() {
 *   const { logEvent, checkGate } = useStatsig();
 *
 *   // Log user interactions
 *   const handleClick = () => {
 *     logEvent('button_clicked', 1, { component: 'MyComponent' });
 *   };
 *
 *   // Check feature flags
 *   const showNewFeature = checkGate('new_feature_enabled');
 *
 *   return (
 *     <div>
 *       {showNewFeature && <NewFeature />}
 *       <button onClick={handleClick}>Click me</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns Object containing Statsig client and helper methods
 */
export const useStatsig = () => {
  const { client } = useContext(StatsigContext);

  /**
   * Log custom events for analytics and tracking user interactions.
   *
   * @param eventName - The name of the event (e.g., 'button_clicked', 'page_viewed')
   * @param value - Optional numeric or string value associated with the event
   * @param metadata - Optional key-value pairs for additional event context
   *
   * @example
   * ```tsx
   * // Simple event
   * logEvent('user_signup');
   *
   * // Event with value
   * logEvent('purchase_completed', 29.99);
   *
   * // Event with metadata
   * logEvent('video_played', 120, {
   *   video_id: 'abc123',
   *   quality: 'HD',
   *   source: 'homepage'
   * });
   * ```
   */
  const logEvent = useCallback(
    (eventName: string, value?: string | number, metadata?: Record<string, string>) => {
      if (client) {
        client.logEvent(eventName, value, metadata);
      }
    },
    [client]
  );

  /**
   * Check if a feature gate is enabled for the current user.
   *
   * @param gateName - The name of the feature gate configured in Statsig
   * @returns Boolean indicating if the gate is enabled (false if client not ready)
   *
   * @example
   * ```tsx
   * const showBetaFeature = checkGate('beta_features_enabled');
   * const allowUploads = checkGate('file_upload_enabled');
   *
   * return (
   *   <div>
   *     {showBetaFeature && <BetaFeatureComponent />}
   *     {allowUploads && <FileUploadButton />}
   *   </div>
   * );
   * ```
   */
  const checkGate = useCallback(
    (gateName: string) => {
      if (client) {
        return client.checkGate(gateName);
      }
      return false;
    },
    [client]
  );

  return {
    /** Direct access to the Statsig client instance */
    client,
    /** Log custom events for analytics */
    logEvent,
    /** Check if a feature gate is enabled */
    checkGate,
  };
};
