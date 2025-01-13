import { FeatureFlagService } from '@adoptdontshop/libs/feature-flags'
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

interface FeatureFlags {
  [key: string]: boolean
}

interface FeatureFlagProviderProps {
  children: ReactNode
}

const FeatureFlagContext = createContext<FeatureFlags>({})

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  children,
}) => {
  const [flags, setFlags] = useState<FeatureFlags>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFlags = async () => {
      try {
        const fetchedFlags = await FeatureFlagService.fetchFeatureFlags() // Fetch all feature flags
        const flagsByName = fetchedFlags.reduce(
          (acc: FeatureFlags, flag: any) => {
            acc[flag.name] = flag.enabled
            return acc
          },
          {},
        )
        setFlags(flagsByName)
      } catch (error) {
        console.error('Failed to load feature flags:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFlags()
  }, [])

  if (loading) {
    return <div>Loading features...</div>
  }

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

// Custom hook to get a specific feature flag by name
export const useFeatureFlag = (flag: string): boolean => {
  const flags = useContext(FeatureFlagContext)
  return flags[flag] || false
}

// Optional: Function to fetch a single flag by name and set it in context
export const useLoadSingleFeatureFlag = (flagName: string) => {
  const [flagEnabled, setFlagEnabled] = useState<boolean>(false)

  useEffect(() => {
    const loadFlag = async () => {
      try {
        const enabled =
          await FeatureFlagService.fetchFeatureFlagByName(flagName)
        setFlagEnabled(enabled)
      } catch (error) {
        console.error(`Failed to load feature flag ${flagName}:`, error)
      }
    }

    loadFlag()
  }, [flagName])

  return flagEnabled
}
