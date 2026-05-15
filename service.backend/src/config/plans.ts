// Re-export canonical plan definitions from the shared lib.
// Backend-specific consumers import from here so there is a single
// override point if backend ever needs to diverge from the shared config.
export {
  PLAN_LIMITS,
  PLAN_HIERARCHY,
  meetsMinPlan,
  planHasFeature,
} from '@adopt-dont-shop/lib.types';
export type { RescuePlan, PlanFeature, PlanLimits } from '@adopt-dont-shop/lib.types';
