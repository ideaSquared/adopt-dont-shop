import { FeatureFlagsService } from '@adopt-dont-shop/lib.feature-flags';
import { createContext, useContext, ReactNode, useMemo, useState } from 'react';

interface FeatureFlagsContextType {
  featureFlagsService: FeatureFlagsService;
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
  
  const featureFlagsService = useMemo(() => {
    return new FeatureFlagsService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  const isFeatureEnabled = async (flag: string): Promise<boolean> => {
    // Simplified implementation - can be enhanced when APIs are finalized
    console.log(`Feature flag ${flag} checked - defaulting to false`);
    return false;
  };

  const value = useMemo(() => ({
    featureFlagsService,
    isFeatureEnabled,
    isLoading,
  }), [featureFlagsService, isLoading]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};