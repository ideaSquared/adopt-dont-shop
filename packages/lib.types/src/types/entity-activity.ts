// ---------------------------------------------------------------------------
// Entity activity — shared API contract for the admin EntityInspector
// ---------------------------------------------------------------------------
//
// The admin app surfaces an "Activity" tab on every entity detail view
// (users, rescues, applications, pets, reports). All of those endpoints
// return the same shape; only the route prefix differs:
//
//   GET /api/v1/users/:id/activity         → EntityActivity[]
//   GET /api/v1/rescues/:id/activity       → EntityActivity[]
//   GET /api/v1/applications/:id/activity  → EntityActivity[]
//   ...
//
// Dates are wire-format ISO 8601 strings (not Date) because these types
// describe JSON responses. Convert at the edge if you need Date objects.

export type EntityType =
  | 'user'
  | 'rescue'
  | 'application'
  | 'pet'
  | 'report'
  | 'chat'
  | 'support_ticket';

export type EntityActivityType =
  | 'application'
  | 'chat'
  | 'favorite'
  | 'profile_update'
  | 'login'
  | 'other';

export type EntityActivity = {
  activityId: string;
  activityType: EntityActivityType;
  action: string;
  description: string;
  category: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type EntityActivityFilters = {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};
