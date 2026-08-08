// ADS-1140 — applicant profile composition.
//
// profile completion %, the pre-population payload, and quick-application
// eligibility are all DERIVED from the adopter's stored ApplicationDefaults
// blob (GetApplicationDefaults) — no dedicated proto surface for them.
// Pure functions, no I/O, same "view adapter" role applications-view.ts
// plays for the applications surface.

export type ApplicationDefaults = {
  personalInfo?: Record<string, unknown>;
  livingSituation?: Record<string, unknown>;
  petExperience?: Record<string, unknown>;
  references?: Record<string, unknown>;
  [key: string]: unknown;
};

const SECTIONS = ['personalInfo', 'livingSituation', 'petExperience', 'references'] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  personalInfo: 'your personal information',
  livingSituation: 'your living situation',
  petExperience: 'your pet experience',
  references: 'your references',
};

function isFilled(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

// Sections with no saved data, in a stable display order.
export function missingSections(defaults: ApplicationDefaults): Section[] {
  return SECTIONS.filter(section => !isFilled(defaults[section]));
}

export function completionPercentage(defaults: ApplicationDefaults): number {
  const filled = SECTIONS.length - missingSections(defaults).length;
  return Math.round((filled / SECTIONS.length) * 100);
}

export type ProfileCompletionStatus = {
  basic_info: boolean;
  living_situation: boolean;
  pet_experience: boolean;
  references: boolean;
  overall_percentage: number;
  last_updated: string | null;
  completed_sections: string[];
  recommended_next_steps: string[];
};

export function buildCompletionStatus(
  defaults: ApplicationDefaults,
  lastUpdated: string | null
): ProfileCompletionStatus {
  const missing = missingSections(defaults);
  return {
    basic_info: !missing.includes('personalInfo'),
    living_situation: !missing.includes('livingSituation'),
    pet_experience: !missing.includes('petExperience'),
    references: !missing.includes('references'),
    overall_percentage: completionPercentage(defaults),
    last_updated: lastUpdated,
    completed_sections: SECTIONS.filter(section => !missing.includes(section)),
    recommended_next_steps: missing.map(section => `Complete ${SECTION_LABELS[section]}`),
  };
}

export type QuickApplicationCapability = {
  canProceed: boolean;
  completionPercentage: number;
  missingRequirements: string[];
  estimatedTimeMinutes: number;
  missingFields: string[];
};

export function buildQuickApplicationCapability(
  defaults: ApplicationDefaults
): QuickApplicationCapability {
  const missing = missingSections(defaults);
  const canProceed = missing.length === 0;
  return {
    canProceed,
    completionPercentage: completionPercentage(defaults),
    missingRequirements: [...missing],
    estimatedTimeMinutes: canProceed ? 5 : Math.max(10, missing.length * 10),
    missingFields: [...missing],
  };
}

export type ProfileCompletionResponse = {
  completionStatus: ProfileCompletionStatus;
  quickApplicationCapability: QuickApplicationCapability;
  prePopulationData: ApplicationDefaults;
  missingFields: string[];
  recommendations: string[];
  canQuickApply: boolean;
};

export function buildProfileCompletionResponse(
  defaults: ApplicationDefaults,
  lastUpdated: string | null
): ProfileCompletionResponse {
  const completionStatus = buildCompletionStatus(defaults, lastUpdated);
  const quickApplicationCapability = buildQuickApplicationCapability(defaults);
  return {
    completionStatus,
    quickApplicationCapability,
    prePopulationData: defaults,
    missingFields: quickApplicationCapability.missingFields,
    recommendations: completionStatus.recommended_next_steps,
    canQuickApply: quickApplicationCapability.canProceed,
  };
}

// --- Application preferences --------------------------------------------

export type ApplicationPreferences = {
  auto_populate: boolean;
  quick_apply_enabled: boolean;
  completion_reminders: boolean;
  [key: string]: unknown;
};

const DEFAULT_PREFERENCES: ApplicationPreferences = {
  auto_populate: true,
  quick_apply_enabled: false,
  completion_reminders: true,
};

// The service stores only what the adopter has explicitly set; the SPA
// expects the full shape back with sensible defaults filled in for
// anything never saved.
export function withPreferenceDefaults(stored: Record<string, unknown>): ApplicationPreferences {
  return { ...DEFAULT_PREFERENCES, ...stored } as ApplicationPreferences;
}
