import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import sequelize from '../../sequelize';
import '../../models/index';
import WebhookEventId from '../../models/WebhookEventId';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock the email service used by the controller so we can verify the
// side-effect handler is invoked exactly once across two requests with
// the same event id. `vi.hoisted` is required because `vi.mock` factories
// run before the test file's top-level statements.
const { handleDeliveryWebhookMock } = vi.hoisted(() => ({
  handleDeliveryWebhookMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/email.service', () => ({
  __esModule: true,
  default: {
    handleDeliveryWebhook: handleDeliveryWebhookMock,
  },
}));

import { handleDeliveryWebhook } from '../../controllers/email.controller';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.post('/webhook', handleDeliveryWebhook);
  return app;
};

const EVENT = {
  messageId: 'msg-abc-123',
  status: 'bounced',
  timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
};

describe('email delivery webhook — per-event idempotency (ADS-734)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    handleDeliveryWebhookMock.mockClear();
    process.env.EMAIL_WEBHOOK_PROVIDER = 'generic';
  });

  it('processes a new event normally and records the event id', async () => {
    const res = await request(buildApp()).post('/webhook').send(EVENT);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Webhook processed successfully' });
    expect(handleDeliveryWebhookMock).toHaveBeenCalledTimes(1);

    const stored = await WebhookEventId.findOne({
      where: { provider: 'generic', event_id: 'msg-abc-123.bounced' },
    });
    expect(stored).not.toBeNull();
  });

  it('returns 200 deduplicated=true on replay and does NOT re-invoke the handler', async () => {
    const app = buildApp();

    const first = await request(app).post('/webhook').send(EVENT);
    expect(first.status).toBe(200);
    expect(handleDeliveryWebhookMock).toHaveBeenCalledTimes(1);

    const second = await request(app).post('/webhook').send(EVENT);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ deduplicated: true });
    expect(handleDeliveryWebhookMock).toHaveBeenCalledTimes(1);
  });

  it('treats a different status for the same messageId as a distinct event', async () => {
    const app = buildApp();

    await request(app)
      .post('/webhook')
      .send({ ...EVENT, status: 'delivered' });
    await request(app)
      .post('/webhook')
      .send({ ...EVENT, status: 'opened' });

    expect(handleDeliveryWebhookMock).toHaveBeenCalledTimes(2);
  });
});
