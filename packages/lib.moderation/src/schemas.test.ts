import { describe, expect, it } from 'vitest';

import { CreateModeratorActionRequestSchema } from './schemas';

const BASE = {
  targetEntityType: 'user' as const,
  targetEntityId: 'usr-1',
  actionType: 'user_suspended' as const,
  severity: 'high' as const,
  reason: 'repeated spam',
};

describe('CreateModeratorActionRequestSchema duration', () => {
  it('reads duration as a number of days: 30 is accepted', () => {
    expect(CreateModeratorActionRequestSchema.safeParse({ ...BASE, duration: 30 }).success).toBe(
      true
    );
  });

  it('accepts no duration (permanent)', () => {
    expect(CreateModeratorActionRequestSchema.safeParse(BASE).success).toBe(true);
  });

  it('rejects a duration longer than ten years of days (not a leftover hours cap)', () => {
    expect(CreateModeratorActionRequestSchema.safeParse({ ...BASE, duration: 3651 }).success).toBe(
      false
    );
  });
});
