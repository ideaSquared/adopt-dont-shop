// ---------------------------------------------------------------------------
// User preference enums — single source of truth shared across backend models
// and frontend forms. No runtime dependencies; safe for both environments.
// ---------------------------------------------------------------------------

export enum ProfileVisibility {
  PUBLIC = 'public',
  RESCUES_ONLY = 'rescues_only',
  PRIVATE = 'private',
}

export enum DigestFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}
