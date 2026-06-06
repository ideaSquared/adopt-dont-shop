// Pure rescue-status state machine.
//
// Verify (the only RPC that touches `rescues.status`) consults this
// table before any DB write. Pure + I/O-free + proto-free so it
// unit-tests in microseconds — same discipline as the pet status
// machine (services/pets/src/grpc/status-machine.ts).
//
// Lifecycle:
//   pending    → verified    (admin signs off — sets verified_at + source)
//   pending    → rejected    (admin rejects with a failure_reason)
//   verified   → suspended   (admin pulls the org)
//   verified   → inactive    (admin/self soft-decommission)
//   suspended  → verified    (admin reinstates)
//   suspended  → inactive    (admin downgrades)
//   inactive   → verified    (admin reactivates)
//   rejected   → pending     (admin reopens after a re-application)
//
// `rejected` is NOT terminal — a rescue can re-apply. The only
// terminal-ish state is the DB soft-delete on the row, which is a
// separate path (Update with deleted_at, not Verify). Self-transitions
// are rejected as no-ops.

import type { RescueStatusDb } from './enum-map.js';

const LEGAL_TRANSITIONS: Record<RescueStatusDb, ReadonlyArray<RescueStatusDb>> = {
  pending: ['verified', 'rejected'],
  verified: ['suspended', 'inactive'],
  suspended: ['verified', 'inactive'],
  inactive: ['verified'],
  rejected: ['pending'],
};

export function isLegalTransition(from: RescueStatusDb, to: RescueStatusDb): boolean {
  if (from === to) {
    return false;
  }
  return LEGAL_TRANSITIONS[from].includes(to);
}

export function legalTargets(from: RescueStatusDb): ReadonlyArray<RescueStatusDb> {
  return LEGAL_TRANSITIONS[from];
}
