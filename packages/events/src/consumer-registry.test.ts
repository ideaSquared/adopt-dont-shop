// Behaviour: every DOMAIN_SUBJECTS entry must have a registry record, and
// every registry record with no consumers must carry a non-empty reason.
//
// Purpose: adding a new stream subject without declaring who consumes it
// (or explicitly documenting that no one does and why) is a CI failure.
// Silent orphans expire after the 7-day retention window; this test makes
// them visible at authoring time instead.

import { describe, expect, it } from 'vitest';

import { DOMAIN_SUBJECTS } from './stream.js';
import { CONSUMER_REGISTRY } from './consumer-registry.js';

describe('CONSUMER_REGISTRY', () => {
  it('has an entry for every DOMAIN_SUBJECTS entry', () => {
    const registeredSubjects = new Set(CONSUMER_REGISTRY.map(e => e.subject));
    for (const subject of DOMAIN_SUBJECTS) {
      expect(
        registeredSubjects.has(subject),
        `DOMAIN_SUBJECTS entry "${subject}" has no entry in CONSUMER_REGISTRY — ` +
          `add a record with consumers or an explicit consumers:[] + reason`
      ).toBe(true);
    }
  });

  it('every zero-consumer entry carries a non-empty reason', () => {
    for (const entry of CONSUMER_REGISTRY) {
      if (entry.consumers.length === 0) {
        expect(
          'reason' in entry && typeof entry.reason === 'string' && entry.reason.length > 0,
          `CONSUMER_REGISTRY entry for "${entry.subject}" has consumers:[] but no non-empty reason`
        ).toBe(true);
      }
    }
  });

  it('has no extra entries beyond DOMAIN_SUBJECTS (registry stays in sync with stream)', () => {
    const domainSet = new Set<string>(DOMAIN_SUBJECTS);
    for (const entry of CONSUMER_REGISTRY) {
      expect(
        domainSet.has(entry.subject),
        `CONSUMER_REGISTRY entry "${entry.subject}" does not exist in DOMAIN_SUBJECTS — ` +
          `remove the stale entry or add the subject to stream.ts`
      ).toBe(true);
    }
  });
});
