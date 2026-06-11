import {
  buildQueryString,
  calculateResolutionTime,
  formatRelativeTime,
  getActionTypeLabel,
  getCategoryLabel,
  getEntityTypeLabel,
  getSeverityColor,
  getSeverityLabel,
  getStatusColor,
  getStatusLabel,
  isReportOverdue,
} from './utils';

describe('moderation labels', () => {
  it('returns human-readable labels for known categories', () => {
    expect(getCategoryLabel('inappropriate_content')).toBe('Inappropriate Content');
    expect(getCategoryLabel('animal_welfare')).toBe('Animal Welfare');
    expect(getCategoryLabel('other')).toBe('Other');
  });

  it('returns human-readable labels for status, severity, action and entity type', () => {
    expect(getStatusLabel('under_review')).toBe('Under Review');
    expect(getSeverityLabel('critical')).toBe('Critical');
    expect(getActionTypeLabel('user_banned')).toBe('User Banned');
    expect(getEntityTypeLabel('conversation')).toBe('Conversation');
  });

  it('exposes a non-empty colour for every severity and status', () => {
    for (const sev of ['low', 'medium', 'high', 'critical'] as const) {
      expect(getSeverityColor(sev)).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const status of [
      'pending',
      'under_review',
      'resolved',
      'dismissed',
      'escalated',
    ] as const) {
      expect(getStatusColor(status)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-04-21T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it.each([
    [new Date(now.getTime() - 30 * 1000), 'just now'],
    [new Date(now.getTime() - 5 * 60 * 1000), '5 minutes ago'],
    [new Date(now.getTime() - 1 * 60 * 1000), '1 minute ago'],
    [new Date(now.getTime() - 2 * 60 * 60 * 1000), '2 hours ago'],
    [new Date(now.getTime() - 24 * 60 * 60 * 1000 * 3), '3 days ago'],
    [new Date(now.getTime() - 24 * 60 * 60 * 1000 * 90), '3 months ago'],
    [new Date(now.getTime() - 24 * 60 * 60 * 1000 * 365 * 2), '2 years ago'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatRelativeTime(input)).toBe(expected);
  });

  it('accepts an ISO string', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 30 * 60 * 1000).toISOString())).toBe(
      '30 minutes ago'
    );
  });
});

describe('calculateResolutionTime', () => {
  it('returns null when not resolved', () => {
    expect(calculateResolutionTime('2026-04-20T00:00:00Z')).toBeNull();
  });

  it('returns hours between created and resolved', () => {
    expect(calculateResolutionTime('2026-04-20T00:00:00Z', '2026-04-20T05:30:00Z')).toBe(5);
  });
});

describe('isReportOverdue', () => {
  const now = new Date('2026-04-21T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns false for any non-pending status', () => {
    const old = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    expect(isReportOverdue(old, 'resolved')).toBe(false);
    expect(isReportOverdue(old, 'under_review')).toBe(false);
  });

  it('returns true for pending reports older than 24h', () => {
    const old = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(isReportOverdue(old, 'pending')).toBe(true);
  });

  it('returns false for pending reports within 24h', () => {
    const recent = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    expect(isReportOverdue(recent, 'pending')).toBe(false);
  });
});

describe('buildQueryString', () => {
  it('returns an empty string for a fully-empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('skips null, undefined and empty-string values', () => {
    expect(buildQueryString({ a: 'x', b: '', c: null, d: undefined, e: 0 })).toBe('?a=x&e=0');
  });

  it('coerces non-string scalars via String()', () => {
    expect(buildQueryString({ page: 2, active: true })).toBe('?page=2&active=true');
  });
});
