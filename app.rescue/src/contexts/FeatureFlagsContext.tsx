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
        // Simplified initialization for now
        console.log('Feature flags service initialized');
      } catch (error) {
        console.error('Failed to initialize feature flags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFeatureFlags();
  }, [featureFlagsService]);

  const isFeatureEnabled = async (flag: string): Promise<boolean> => {
    try {
      // Simplified implementation for now - return false for safety
      console.log(`Feature flag ${flag} checked - defaulting to false`);
      return false;
    } catch (error) {
      console.error(`Failed to check feature flag ${flag}:`, error);
      return false;
    }
  };

  const getDynamicConfig = (configName: string): DynamicConfig | null => {
    try {
      return featureFlagsService.getDynamicConfig(configName);
    } catch (error) {
      console.error(`Failed to get dynamic config ${configName}:`, error);
      return null;
    }
  };

  const checkGate = (gateName: string): boolean => {
    try {
      return featureFlagsService.checkGate(gateName);
    } catch (error) {
      console.error(`Failed to check gate ${gateName}:`, error);
      return false;
    }
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
