import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMetricsRegistry, __resetMetricsForTest } from '@adopt-dont-shop/observability';

import { recordDeadLetter, __resetDeadLetterMetricsForTest } from './dead-letter-metrics.js';
import { deadLetter } from './subscribe.js';

describe('events_dead_letter_total metric', () => {
  beforeEach(() => {
    // Fresh shared registry + fresh counter singleton per test so the
    // counter re-registers against the new registry.
    __resetMetricsForTest();
    __resetDeadLetterMetricsForTest();
  });

  it('is exposed on the shared /metrics registry and counts per subject', async () => {
    recordDeadLetter('pets.created');
    recordDeadLetter('pets.created');
    recordDeadLetter('chat.messageSent');

    const text = await getMetricsRegistry().metrics();
    expect(text).toContain('events_dead_letter_total{subject="pets.created"} 2');
    expect(text).toContain('events_dead_letter_total{subject="chat.messageSent"} 1');
  });

  it('deadLetter() increments the counter after parking the message', async () => {
    const publish = vi.fn(async () => ({ seq: 1 }));
    const nc = { jetstream: vi.fn(() => ({ publish })) } as unknown as NatsConnection;

    await deadLetter(nc, 'applications.submitted', '{"id":"e1"}', new Error('boom'));

    // The message was published to the DLQ...
    expect(publish).toHaveBeenCalledTimes(1);
    // ...and the dead-letter was metered.
    const text = await getMetricsRegistry().metrics();
    expect(text).toContain('events_dead_letter_total{subject="applications.submitted"} 1');
  });
});
