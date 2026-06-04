import { describe, it, expect, beforeEach, vi } from 'vitest';
import sequelize from '../../sequelize';
import WebhookEventId from '../../models/WebhookEventId';
import {
  assertNotReplayed,
  WebhookReplayError,
} from '../../services/email/webhook-idempotency.service';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('webhook-idempotency.service (ADS-734)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  it('records a new event id and returns without error on first call', async () => {
    await assertNotReplayed('generic', 'evt-1');

    const row = await WebhookEventId.findOne({
      where: { provider: 'generic', event_id: 'evt-1' },
    });
    expect(row).not.toBeNull();
    expect(row?.received_at).toBeInstanceOf(Date);
  });

  it('throws WebhookReplayError when the same (provider, eventId) is seen again', async () => {
    await assertNotReplayed('postmark', 'evt-dup');

    await expect(assertNotReplayed('postmark', 'evt-dup')).rejects.toBeInstanceOf(
      WebhookReplayError
    );
  });

  it('treats the same event id under different providers as distinct events', async () => {
    await assertNotReplayed('sendgrid', 'shared-evt');
    await expect(assertNotReplayed('postmark', 'shared-evt')).resolves.toBeUndefined();

    const rows = await WebhookEventId.findAll({ where: { event_id: 'shared-evt' } });
    expect(rows).toHaveLength(2);
  });
});
