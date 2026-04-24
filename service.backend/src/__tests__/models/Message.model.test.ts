import { Sequelize } from 'sequelize';
import { describe, expect, it, vi } from 'vitest';

// Bypass the real sequelize instance — we only need the model's rawAttributes.
vi.mock('../../sequelize', () => ({
  __esModule: true,
  default: new Sequelize('sqlite::memory:', { logging: false }),
}));

import Message from '../../models/Message';

describe('Message model defaults', () => {
  // Regression: both columns are NOT NULL JSON in the DB. Without a
  // model-level defaultValue, every Message.create() that doesn't
  // explicitly pass reactions/read_status fails validation with
  // "notNull Violation: Message.reactions cannot be null" — which broke
  // POST /messages end-to-end.
  it('defaults reactions to an empty array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = Message.rawAttributes as Record<string, any>;
    expect(attrs.reactions.allowNull).toBe(false);
    expect(Array.isArray(attrs.reactions.defaultValue)).toBe(true);
    expect(attrs.reactions.defaultValue).toHaveLength(0);
  });

  it('defaults read_status to an empty array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = Message.rawAttributes as Record<string, any>;
    expect(attrs.read_status.allowNull).toBe(false);
    expect(Array.isArray(attrs.read_status.defaultValue)).toBe(true);
    expect(attrs.read_status.defaultValue).toHaveLength(0);
  });

  it('defaults attachments to an empty array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = Message.rawAttributes as Record<string, any>;
    // attachments had a defaultValue already — this test locks that in so
    // it doesn't regress alongside the above two.
    expect(Array.isArray(attrs.attachments.defaultValue)).toBe(true);
  });
});
