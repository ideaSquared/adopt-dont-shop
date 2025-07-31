import { FeatureFlagsService, DynamicConfig } from '@adopt-dont-shop/lib-feature-flags';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';

interface FeatureFlagsContextType {
  featureFlagsService: FeatureFlagsService;
  isFeatureEnabled: (flag: string) => Promise<boolean>;
  getDynamicConfig: (configName: string) => DynamicConfig | null;
  checkGate: (gateName: string) => boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  
  const featureFlagsService = useMemo(() => {
    return new FeatureFlagsService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  useEffect(() => {
    const initializeFeatureFlags = async () => {
      try {
        // Try to load public flags to test connectivity
        await featureFlagsService.getPublicFlags();
      } catch (error) {
        console.error('Failed to initialize feature flags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFeatureFlags();
  }, [featureFlagsService]);

  const isFeatureEnabled = async (flag: string): Promise<boolean> => {
    return await featureFlagsService.isFeatureEnabled(flag);
  };

  const getDynamicConfig = (configName: string): DynamicConfig | null => {
    return featureFlagsService.getDynamicConfig(configName);
  };

  const checkGate = (gateName: string): boolean => {
    return featureFlagsService.checkGate(gateName);
  };

  const value = useMemo(() => ({
    featureFlagsService,
    isFeatureEnabled,
    getDynamicConfig,
    checkGate,
    isLoading,
  }), [featureFlagsService, isLoading]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
