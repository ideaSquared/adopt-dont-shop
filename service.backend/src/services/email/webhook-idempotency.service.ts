/**
 * ADS-734: per-event webhook replay idempotency.
 *
 * The signature middleware (`middleware/webhook-signature.ts`) rejects
 * payloads outside the 120 s timestamp-skew window, but within that
 * window an attacker who captured a signed event can still replay it.
 * This service makes processing idempotent: the first time we see a
 * `(provider, eventId)` pair we record it; every subsequent attempt
 * raises `WebhookReplayError`, which the route maps to HTTP 200 +
 * `{ deduplicated: true }` so the provider stops retrying.
 *
 * See `docs/security/webhook-replay-protection.md`.
 */
import { UniqueConstraintError } from 'sequelize';
import WebhookEventId from '../../models/WebhookEventId';

export class WebhookReplayError extends Error {
  public readonly provider: string;
  public readonly eventId: string;

  constructor(provider: string, eventId: string) {
    super(`Webhook event already processed: ${provider}:${eventId}`);
    this.name = 'WebhookReplayError';
    this.provider = provider;
    this.eventId = eventId;
  }
}

/**
 * Insert a (provider, eventId) row. Throws `WebhookReplayError` if the
 * row already exists; any other DB error is re-thrown so the caller can
 * surface a 500 (provider will retry on 5xx, which is the safe default
 * when we genuinely failed to persist the dedup row).
 */
export const assertNotReplayed = async (provider: string, eventId: string): Promise<void> => {
  try {
    await WebhookEventId.create({ provider, event_id: eventId });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new WebhookReplayError(provider, eventId);
    }
    throw err;
  }
};
