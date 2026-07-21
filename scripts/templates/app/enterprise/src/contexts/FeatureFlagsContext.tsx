import { createContext, useContext, ReactNode, useMemo, useState } from 'react';

// lib.feature-flags is now hook-based (Statsig): use `useFeatureGate`,
// `useDynamicConfig`, `useConfigValue` directly in components. This context is
// a minimal scaffold stub for app-wide loading state; wire `isFeatureEnabled`
// to a real source (or drop it in favour of the hooks) once your gates exist.
interface FeatureFlagsContextType {
  isFeatureEnabled: (flag: string) => Promise<boolean>;
  isLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
};

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

export const FeatureFlagsProvider = ({ children }: FeatureFlagsProviderProps) => {
  const [isLoading] = useState(false);

  const isFeatureEnabled = async (flag: string): Promise<boolean> => {
    // Scaffold stub — replace with a real gate lookup (or the useFeatureGate
    // hook) once your feature flags are defined.
    console.log(`Feature flag ${flag} checked - defaulting to false`);
    return false;
  };

  const value = useMemo(
    () => ({
      isFeatureEnabled,
      isLoading,
    }),
    [isLoading]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
};
