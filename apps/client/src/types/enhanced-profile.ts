// Re-export from the canonical types index for this app
export type {
  ApplicationDefaults,
  ApplicationPreferences,
  ProfileCompletionStatus,
  ProfileCompletionResponse,
  QuickApplicationCapability,
  ApplicationPrePopulationData,
} from './index';

// Profile Setup Progress (unique to enhanced-profile feature)
export type ProfileSetupProgress = {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  nextRecommendedStep: string;
  estimatedTimeToComplete: number;
};
