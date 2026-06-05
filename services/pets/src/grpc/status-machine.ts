// Pure pet-status state machine.
//
// The legal-transition table is the single source of truth for which
// status changes UpdateStatus will accept. Keeping it pure + I/O-free
// (no DB, no proto) makes it trivially unit-testable — the same
// `apply`/`fold` discipline CAD used for the incident domain.
//
// Transitions model the real adoption lifecycle:
//   available ⇄ pending          (application opened / withdrawn)
//   pending   → adopted           (adoption completed)
//   available ⇄ foster            (sent to / returned from foster)
//   available ⇄ medical_hold      (vet hold on / off)
//   available ⇄ behavioral_hold   (behaviour hold on / off)
//   any        → not_available    (admin pulls the listing)
//   any        → deceased         (terminal)
//   not_available → available     (re-list)
//   adopted   → available         (adoption fell through / returned)
//
// `deceased` is terminal — nothing leaves it. Self-transitions (status
// unchanged) are rejected as a no-op so the audit log never records a
// spurious A→A row.

import type { PetStatusDb } from './enum-map.js';

const LEGAL_TRANSITIONS: Record<PetStatusDb, ReadonlyArray<PetStatusDb>> = {
  available: ['pending', 'foster', 'medical_hold', 'behavioral_hold', 'not_available', 'deceased'],
  pending: ['available', 'adopted', 'not_available', 'deceased'],
  adopted: ['available', 'not_available', 'deceased'],
  foster: ['available', 'adopted', 'medical_hold', 'not_available', 'deceased'],
  medical_hold: ['available', 'behavioral_hold', 'not_available', 'deceased'],
  behavioral_hold: ['available', 'medical_hold', 'not_available', 'deceased'],
  not_available: ['available', 'deceased'],
  deceased: [],
};

export function isLegalTransition(from: PetStatusDb, to: PetStatusDb): boolean {
  if (from === to) {
    return false;
  }
  return LEGAL_TRANSITIONS[from].includes(to);
}

// Exported so the test can assert the table is total (every status has
// an entry) without reaching into the private constant.
export function legalTargets(from: PetStatusDb): ReadonlyArray<PetStatusDb> {
  return LEGAL_TRANSITIONS[from];
}
