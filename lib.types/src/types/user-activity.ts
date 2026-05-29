// ---------------------------------------------------------------------------
// User activity — shared API contract between service.backend and admin app
// ---------------------------------------------------------------------------
//
// The activity-log shape was generalised into EntityActivity (see
// entity-activity.ts) so the admin EntityInspector can drive every
// entity tab from one type. UserActivity / UserActivityFilters /
// UserActivityType are kept as aliases so existing consumers keep
// compiling — prefer the Entity* names in new code.
//
// UserActivitySummary stays user-specific because aggregate-stats shapes
// differ per entity (a rescue summary, for example, would expose verified
// staff count rather than messages exchanged).

import type { EntityActivity, EntityActivityFilters, EntityActivityType } from './entity-activity';

export type UserActivityType = EntityActivityType;
export type UserActivity = EntityActivity;
export type UserActivityFilters = EntityActivityFilters;

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
