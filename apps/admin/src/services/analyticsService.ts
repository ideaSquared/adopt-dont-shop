import { apiService } from './libraryServices';

export type PlatformMetrics = {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  rescues: {
    total: number;
    verified: number;
    pending: number;
    newThisMonth: number;
  };
  pets: {
    total: number;
    available: number;
    adopted: number;
    newThisMonth: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    newThisMonth: number;
  };
};

export type TopUserActivity = {
  activity: string;
  count: number;
  percentage: number;
};

export type PetTypeMetric = {
  type: string;
  count: number;
  adoptionRate: number;
};

export type AdoptionTrend = {
  date: string;
  value: number;
};

export type RescuePerformance = {
  rescueId: string;
  rescueName: string;
  adoptions: number;
  averageTimeToAdoption: number;
  adoptionRate: number;
  totalPets: number;
};

export type DashboardAnalytics = {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowthRate: number;
    avgSessionDuration: number;
    retentionRate: number;
    topUserActivities: TopUserActivity[];
  };
  adoptions: {
    totalAdoptions: number;
    adoptionRate: number;
    avgTimeToAdoption: number;
    popularPetTypes: PetTypeMetric[];
    adoptionTrends: AdoptionTrend[];
    rescuePerformance: RescuePerformance[];
  };
  applications: {
    statusMetrics: Record<string, number>;
    trends: Array<{ date: string; count: number }>;
    avgProcessingTime: number;
    totalApplications: number;
    approvalRate: number;
  };
  generatedAt: string;
};

export type DashboardAnalyticsOptions = {
  startDate?: Date;
  endDate?: Date;
};

const getPlatformMetrics = async (): Promise<PlatformMetrics> => {
  const response = await apiService.get<{ success: boolean; data: PlatformMetrics }>(
    '/api/v1/admin/metrics'
  );
  return response.data;
};

const getDashboardAnalytics = async (
  options?: DashboardAnalyticsOptions
): Promise<DashboardAnalytics> => {
  const params: Record<string, string> = {};
  if (options?.startDate) {
    params.startDate = options.startDate.toISOString();
  }
  if (options?.endDate) {
    params.endDate = options.endDate.toISOString();
  }

  const response = await apiService.get<{ success: boolean; data: DashboardAnalytics }>(
    '/api/v1/admin/analytics/dashboard',
    params
  );
  return response.data;
};

export const analyticsService = { getPlatformMetrics, getDashboardAnalytics };
