import { describe, expect, it } from 'vitest';

import { CONSUMER_REGISTRY } from './consumer-registry.js';
import { EXPECTED_GDPR_SERVICES } from './gdpr.js';

// EXPECTED_GDPR_SERVICES is the single source of truth for the saga's
// completion-count (ADS-785). The CONSUMER_REGISTRY's gdpr.> entry is the
// independently-maintained record of which services subscribe to the saga.
// This assertion fails the build if the two drift apart — i.e. if a service
// is added/removed from the saga without updating EXPECTED_GDPR_SERVICES.
//
// The registry lists every gdpr.> consumer; the saga PARTICIPANTS are the
// services that erase their slice and publish a completion (those wired via
// registerGdprSubscriber). The audit service is the aggregator, not a
// participant — it consumes completions rather than emitting one — so it is
// excluded from the expected set.
describe('EXPECTED_GDPR_SERVICES drift guard', () => {
  it('matches the gdpr.> saga participants declared in CONSUMER_REGISTRY', () => {
    const gdpr = CONSUMER_REGISTRY.find(e => e.subject === 'gdpr.>');
    if (gdpr === undefined || !('consumers' in gdpr)) {
      throw new Error('CONSUMER_REGISTRY is missing a gdpr.> entry with consumers');
    }

    const participants = gdpr.consumers
      .filter(c => c.description.includes('registerGdprSubscriber'))
      .map(c => c.service.replace(/^service\./, ''))
      .sort();

    expect(participants).toEqual([...EXPECTED_GDPR_SERVICES].sort());
  });

  it('has no duplicate entries', () => {
    expect(new Set(EXPECTED_GDPR_SERVICES).size).toBe(EXPECTED_GDPR_SERVICES.length);
  });
});
