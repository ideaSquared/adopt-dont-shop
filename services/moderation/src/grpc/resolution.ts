// Valid stored values for moderation.reports.resolution. These mirror the
// admin list schema (lib.moderation ResolutionTypeSchema) — a value outside
// this set makes the admin queue fail to parse.
export const RESOLUTIONS = [
  'no_action',
  'warning_issued',
  'content_removed',
  'user_suspended',
  'user_banned',
  'escalated',
] as const;

export type Resolution = (typeof RESOLUTIONS)[number];

// Wire sentinel: ResolveReport callers send 'dismissed' to close a report as
// dismissed. Dismissal is a status (ADS-1159), not a resolution, so it is
// stored as 'no_action'.
export const DISMISSED_SENTINEL = 'dismissed';

const isResolution = (raw: string): raw is Resolution =>
  (RESOLUTIONS as readonly string[]).includes(raw);

export type ResolveTarget = { resolution: Resolution; dismissed: boolean };

// Write side: undefined means the caller sent a value we refuse to persist.
export const parseResolveTarget = (raw: string): ResolveTarget | undefined => {
  if (raw === DISMISSED_SENTINEL) {
    return { resolution: 'no_action', dismissed: true };
  }
  return isResolution(raw) ? { resolution: raw, dismissed: false } : undefined;
};

// Read side: legacy rows hold 'resolved' / 'dismissed' (written before the
// value set was enforced). Tolerate anything so one bad row never breaks a list.
export const readableResolution = (raw: string): Resolution =>
  isResolution(raw) ? raw : 'no_action';
