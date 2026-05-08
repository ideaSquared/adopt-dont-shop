import { describe, it, expect } from 'vitest';
import { buildAnonymousPlaceholder } from '../../services/data-deletion.service';

describe('buildAnonymousPlaceholder', () => {
  it('returns a deterministic placeholder for the same userId', () => {
    const a = buildAnonymousPlaceholder('user-123');
    const b = buildAnonymousPlaceholder('user-123');
    expect(a).toBe(b);
  });

  it('produces different placeholders for different userIds', () => {
    expect(buildAnonymousPlaceholder('user-1')).not.toBe(buildAnonymousPlaceholder('user-2'));
  });

  it('starts with deleted-user- prefix and ends with a 12-hex digest', () => {
    const placeholder = buildAnonymousPlaceholder('any');
    expect(placeholder).toMatch(/^deleted-user-[0-9a-f]{12}$/);
  });

  it('produces a value short enough to fit in firstName/lastName (≤100 chars)', () => {
    const placeholder = buildAnonymousPlaceholder('verylongidentifier-' + 'x'.repeat(200));
    expect(placeholder.length).toBeLessThanOrEqual(100);
  });
});
