import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import {
  PLAN_LIMITS,
  type PlanFeature,
  type PlanLimits,
  type RescuePlan,
} from '@adopt-dont-shop/lib.types';
import { apiService } from '../services/libraryServices';

type UsePlanResult = {
  plan: RescuePlan;
  planLimits: PlanLimits;
  hasFeature: (feature: PlanFeature) => boolean;
  isLoading: boolean;
  error: string | null;
};

type RescueWithPlan = {
  plan?: RescuePlan;
  planLimits?: PlanLimits;
};

export const usePlan = (): UsePlanResult => {
  const { user } = useAuth();
  const rescueId = user?.rescueId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['rescue', rescueId, 'plan'],
    queryFn: async (): Promise<RescuePlan> => {
      const response = await apiService.get<{ success: boolean; data: RescueWithPlan }>(
        `/api/v1/rescues/${rescueId}`
      );
      return response.data.plan ?? 'free';
    },
    enabled: Boolean(rescueId),
    staleTime: 5 * 60 * 1000,
  });

  const plan: RescuePlan = data ?? 'free';
  const planLimits = PLAN_LIMITS[plan];

  return {
    plan,
    planLimits,
    hasFeature: (feature: PlanFeature) =>
      (planLimits.features as ReadonlyArray<PlanFeature>).includes(feature),
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
};
