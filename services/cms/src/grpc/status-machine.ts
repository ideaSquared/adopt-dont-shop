// Pure content-status state machine.
//
// The legal-transition table is the single source of truth for which
// status changes the publish/unpublish/archive handlers will accept.
// Keeping it pure + I/O-free (no DB, no proto) mirrors the pets
// service's status-machine and makes it trivially testable.
//
// Lifecycle (the verbs the handlers expose):
//   draft               -> published   (publish)
//   {draft, scheduled}  -> published   (publish)
//   {published, scheduled} -> draft     (unpublish)
//   {draft, published, scheduled} -> archived (archive)
//   archived            -> draft        (restore)
//
// Self-transitions (status unchanged) are rejected as a no-op. Illegal
// jumps (e.g. archived -> published, draft -> archived-then-published)
// are rejected. `scheduled` is reachable only via the scheduler write
// path, not these handlers, but it is a legal *source* so a scheduled
// item can still be published / unpublished / archived by an admin.

type ContentStatus = 'draft' | 'published' | 'archived' | 'scheduled';

const LEGAL_TRANSITIONS: Record<ContentStatus, ReadonlyArray<ContentStatus>> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  scheduled: ['published', 'draft', 'archived'],
  archived: ['draft'],
};

export function isLegalTransition(from: ContentStatus, to: ContentStatus): boolean {
  if (from === to) {
    return false;
  }
  return LEGAL_TRANSITIONS[from].includes(to);
}

// Exported so the test can assert the table is total (every status has
// an entry) without reaching into the private constant.
export function legalTargets(from: ContentStatus): ReadonlyArray<ContentStatus> {
  return LEGAL_TRANSITIONS[from];
}
