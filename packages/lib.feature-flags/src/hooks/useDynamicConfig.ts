import { StatsigContext } from '@statsig/react-bindings';
import { useContext } from 'react';
import {
  KnownConfig,
  ApplicationSettingsConfig,
  SystemSettingsConfig,
  ModerationSettingsConfig,
} from '../types';

type ConfigValue<T extends string> =
  T extends typeof import('../types').KNOWN_CONFIGS.APPLICATION_SETTINGS
    ? ApplicationSettingsConfig
    : T extends typeof import('../types').KNOWN_CONFIGS.SYSTEM_SETTINGS
      ? SystemSettingsConfig
      : T extends typeof import('../types').KNOWN_CONFIGS.MODERATION_SETTINGS
        ? ModerationSettingsConfig
        : Record<string, unknown>;

/**
 * Hook to get a dynamic configuration value
 *
 * @example
 * ```tsx
 * import { useDynamicConfig, KNOWN_CONFIGS } from '@adopt-dont-shop/lib.feature-flags';
 *
 * function MyComponent() {
 *   const config = useDynamicConfig(KNOWN_CONFIGS.APPLICATION_SETTINGS);
 *   const maxApps = config?.max_applications_per_user ?? 5;
 *
 *   return <div>You can apply to up to {maxApps} pets</div>;
 * }
 * ```
 */
export const useDynamicConfig = <T extends KnownConfig | string>(
  configName: T
): ConfigValue<T> | null => {
  const { client } = useContext(StatsigContext);

  if (!client) {
    console.warn(
      `[useDynamicConfig] Statsig client not initialized, returning null for config: ${configName}`
    );
    return null;
  }

  const config = client.getDynamicConfig(configName);
  return config?.value as ConfigValue<T> | null;
};

/**
 * Hook to get a specific value from a dynamic configuration
 *
 * @example
 * ```tsx
 * import { useConfigValue, KNOWN_CONFIGS } from '@adopt-dont-shop/lib.feature-flags';
 *
 * function MyComponent() {
 *   const maxApps = useConfigValue(
 *     KNOWN_CONFIGS.APPLICATION_SETTINGS,
 *     'max_applications_per_user',
 *     5
 *   );
 *
 *   return <div>You can apply to up to {maxApps} pets</div>;
 * }
 * ```
 */
export const useConfigValue = <T = unknown>(
  configName: KnownConfig | string,
  key: string,
  defaultValue: T
): T => {
  const { client } = useContext(StatsigContext);

  if (!client) {
    console.warn(
      `[useConfigValue] Statsig client not initialized, returning default for ${configName}.${key}`
    );
    return defaultValue;
  }

  const config = client.getDynamicConfig(configName);
  const value = config?.get(key, defaultValue);
  return (value ?? defaultValue) as T;
};
