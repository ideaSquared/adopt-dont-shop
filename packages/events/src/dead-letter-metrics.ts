// Dead-letter metric (ADS-1052).
//
// A single Prometheus counter tracks how many messages have been parked in
// the dead-letter stream, labelled by the original subject:
//   events_dead_letter_total{subject="pets.created"} — messages dead-lettered
//
// The counter is registered on the shared observability registry so it
// appears on the /metrics endpoint alongside the standard HTTP/gRPC
// histograms. It is incremented by deadLetter() in subscribe.ts whenever a
// poison message is parked. Mirrors the audit service's gdpr-metrics module.

import { Counter, getMetricsRegistry } from '@adopt-dont-shop/observability';

// Module-level singleton so the counter is only registered once across all
// calls (prom-client throws if the same metric name is registered twice in
// the same process).
let _counter: InstanceType<typeof Counter<'subject'>> | null = null;

const getDeadLetterCounter = (): InstanceType<typeof Counter<'subject'>> => {
  if (_counter) {
    return _counter;
  }
  const registry = getMetricsRegistry();
  _counter = new Counter<'subject'>({
    name: 'events_dead_letter_total',
    help: 'Total messages parked in the dead-letter stream, by original subject.',
    labelNames: ['subject'],
    registers: [registry],
  });
  return _counter;
};

// recordDeadLetter increments the counter for the given original subject.
// Called by deadLetter() after a message is parked in the DLQ.
export const recordDeadLetter = (subject: string): void => {
  getDeadLetterCounter().inc({ subject });
};

// --- Test-only helper -------------------------------------------------------

export const __resetDeadLetterMetricsForTest = (): void => {
  _counter = null;
};
