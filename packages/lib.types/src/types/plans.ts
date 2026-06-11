export type RescuePlan = 'free' | 'growth' | 'professional';

export type PlanFeature =
  | 'analytics'
  | 'analytics_export'
  | 'reports'
  | 'scheduled_reports'
  | 'custom_questions'
  | 'bulk_operations';

export type PlanLimits = {
  /** Maximum active staff members. null = unlimited. */
  maxStaffSeats: number | null;
  /** Maximum active/available pet listings. null = unlimited. */
  maxActivePets: number | null;
  /** Analytics history window in days. null = no analytics; 0 = full history. */
  analyticsHistoryDays: number | null;
  /** Maximum custom application questions. null = unlimited. */
  maxCustomQuestions: number | null;
  /** Named features available on this plan. */
  features: ReadonlyArray<PlanFeature>;
};

/** Ordered from lowest to highest so index comparison works for tier checks. */
export const PLAN_HIERARCHY: ReadonlyArray<RescuePlan> = ['free', 'growth', 'professional'];

export const PLAN_LIMITS: Record<RescuePlan, PlanLimits> = {
  free: {
    maxStaffSeats: 5,
    maxActivePets: 25,
    analyticsHistoryDays: null,
    maxCustomQuestions: 0,
    features: [],
  },
  growth: {
    maxStaffSeats: 15,
    maxActivePets: 100,
    analyticsHistoryDays: 90,
    maxCustomQuestions: 5,
    features: ['analytics', 'reports'],
  },
  professional: {
    maxStaffSeats: null,
    maxActivePets: null,
    analyticsHistoryDays: 0,
    maxCustomQuestions: null,
    features: [
      'analytics',
      'analytics_export',
      'reports',
      'scheduled_reports',
      'custom_questions',
      'bulk_operations',
    ],
  },
} as const;

/** Returns true if candidatePlan meets or exceeds the required minimum tier. */
export const meetsMinPlan = (candidatePlan: RescuePlan, minPlan: RescuePlan): boolean =>
  PLAN_HIERARCHY.indexOf(candidatePlan) >= PLAN_HIERARCHY.indexOf(minPlan);

/** Returns true if the plan includes the given feature. */
export const planHasFeature = (plan: RescuePlan, feature: PlanFeature): boolean =>
  (PLAN_LIMITS[plan].features as ReadonlyArray<PlanFeature>).includes(feature);
