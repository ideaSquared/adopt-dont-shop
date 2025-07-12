import { StatsigContext } from '@statsig/react-bindings';
import { useContext } from 'react';

/**
 * Custom hook to access Statsig client and common functionality for feature flags,
 * experiments, dynamic configs, and event logging.
 *
 * @example
 * ```tsx
 * import { useStatsig } from '@/hooks/useStatsig';
 *
 * function MyComponent() {
 *   const { logEvent, checkGate, getExperiment } = useStatsig();
 *
 *   // Log user interactions
 *   const handleClick = () => {
 *     logEvent('button_clicked', 1, { component: 'MyComponent' });
 *   };
 *
 *   // Check feature flags
 *   const showNewFeature = checkGate('new_feature_enabled');
 *
 *   // Get experiment configurations
 *   const experiment = getExperiment('homepage_layout_test');
 *   const layout = experiment?.get('layout', 'default');
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
  const logEvent = (
    eventName: string,
    value?: string | number,
    metadata?: Record<string, string>
  ) => {
    if (client) {
      client.logEvent(eventName, value, metadata);
    }
  };

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
  const checkGate = (gateName: string) => {
    if (client) {
      return client.checkGate(gateName);
    }
    return false;
  };

  /**
   * Get experiment configuration for A/B testing and variant assignment.
   *
   * @param experimentName - The name of the experiment configured in Statsig
   * @returns Experiment object with get() method to retrieve parameter values, or null
   *
   * @example
   * ```tsx
   * const layoutExperiment = getExperiment('homepage_layout_test');
   * const buttonColor = layoutExperiment?.get('button_color', 'blue');
   * const headerText = layoutExperiment?.get('header_text', 'Welcome!');
   *
   * return (
   *   <div>
   *     <h1>{headerText}</h1>
   *     <button style={{ backgroundColor: buttonColor }}>
   *       Get Started
   *     </button>
   *   </div>
   * );
   * ```
   */
  const getExperiment = (experimentName: string) => {
    if (client) {
      return client.getExperiment(experimentName);
    }
    return null;
  };

  /**
   * Get dynamic configuration values that can be updated remotely without code changes.
   *
   * @param configName - The name of the dynamic config configured in Statsig
   * @returns Config object with get() method to retrieve values, or null
   *
   * @example
   * ```tsx
   * const appConfig = getDynamicConfig('app_settings');
   * const maxFileSize = appConfig?.get('max_upload_size_mb', 10);
   * const apiTimeout = appConfig?.get('api_timeout_ms', 5000);
   * const enabledFeatures = appConfig?.get('enabled_features', []);
   *
   * // Use config values
   * const uploadLimitText = `Max file size: ${maxFileSize}MB`;
   * ```
   */
  const getDynamicConfig = (configName: string) => {
    if (client) {
      return client.getDynamicConfig(configName);
    }
    return null;
  };

  return {
    /** Direct access to the Statsig client instance */
    client,
    /** Log custom events for analytics */
    logEvent,
    /** Check if a feature gate is enabled */
    checkGate,
    /** Get experiment configuration for A/B testing */
    getExperiment,
    /** Get dynamic configuration values */
    getDynamicConfig,
  };
};
