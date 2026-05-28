// ---------------------------------------------------------------------------
// User activity — shared API contract between service.backend and admin app
// ---------------------------------------------------------------------------
//
// Two distinct endpoints share these types:
//   GET /api/v1/users/:userId/activity          → UserActivity[]
//   GET /api/v1/users/:userId/activity-summary  → UserActivitySummary
//
// Dates are wire-format ISO 8601 strings (not Date) because these types
// describe JSON responses. Convert at the edge if you need Date objects.

export type UserActivityType =
  | 'application'
  | 'chat'
  | 'favorite'
  | 'profile_update'
  | 'login'
  | 'other';

export type UserActivity = {
  activityId: number;
  activityType: UserActivityType;
  action: string;
  description: string;
  category: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type UserActivityFilters = {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type UserActivityRecentItem = {
  action: string;
  entity: string;
  timestamp: string;
  details: Record<string, unknown>;
};

export type UserActivitySummary = {
  applicationsCount: number;
  activeChatsCount: number;
  petsFavoritedCount: number;
  recentActivity: UserActivityRecentItem[];
  stats: {
    totalLoginCount: number;
    averageSessionDuration: number;
    lastLoginAt: string | null;
    accountCreatedAt: string;
    profileCompleteness: number;
  };
};
