import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatChatTimestamp } from './format-chat-timestamp';

describe('formatChatTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['2026-06-15T11:59:30Z', 'Just now'],
    ['2026-06-15T11:55:00Z', '5m ago'],
    ['2026-06-15T09:00:00Z', '3h ago'],
    ['2026-06-13T12:00:00Z', '2d ago'],
    ['2026-01-05T12:00:00Z', '05 Jan 2026'],
  ])('formats %s as %s', (timestamp, expected) => {
    expect(formatChatTimestamp(timestamp)).toBe(expected);
  });
});
