import {
  buildQueryString,
  calculateResolutionTime,
  formatDuration,
  formatTicketId,
  getCategoryIcon,
  getCategoryLabel,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusLabel,
  getTicketAge,
  isTicketOverdue,
  needsAttention,
} from './utils';

describe('support-ticket labels and colours', () => {
  it('returns human-readable labels for category, status and priority', () => {
    expect(getCategoryLabel('technical_issue')).toBe('Technical Issue');
    expect(getStatusLabel('waiting_for_user')).toBe('Waiting for User');
    expect(getPriorityLabel('critical')).toBe('Critical');
  });

  it('returns hex colours for every priority and status', () => {
    for (const p of ['low', 'normal', 'high', 'urgent', 'critical'] as const) {
      expect(getPriorityColor(p)).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const s of [
      'open',
      'in_progress',
      'waiting_for_user',
      'resolved',
      'closed',
      'escalated',
    ] as const) {
      expect(getStatusColor(s)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('exposes an icon for every known category', () => {
    expect(getCategoryIcon('technical_issue')).toBe('bug');
    expect(getCategoryIcon('payment_issue')).toBe('credit-card');
  });
});

describe('time helpers', () => {
  const now = new Date('2026-04-21T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('calculateResolutionTime', () => {
    it('returns null when not resolved', () => {
      expect(calculateResolutionTime('2026-04-20T00:00:00Z')).toBeNull();
      expect(calculateResolutionTime('2026-04-20T00:00:00Z', null)).toBeNull();
    });

    it('returns hours between created and resolved', () => {
      expect(calculateResolutionTime('2026-04-20T00:00:00Z', '2026-04-20T07:00:00Z')).toBe(7);
    });
  });

  describe('isTicketOverdue', () => {
    it('returns false when there is no due date', () => {
      expect(isTicketOverdue(null, 'open')).toBe(false);
    });

    it('returns false when status is not active', () => {
      const past = new Date(now.getTime() - 60 * 60 * 1000);
      expect(isTicketOverdue(past, 'closed')).toBe(false);
      expect(isTicketOverdue(past, 'resolved')).toBe(false);
    });

    it('returns true when due date is in the past for an open ticket', () => {
      const past = new Date(now.getTime() - 60 * 60 * 1000);
      expect(isTicketOverdue(past, 'open')).toBe(true);
      expect(isTicketOverdue(past, 'in_progress')).toBe(true);
    });

    it('returns false when due date is in the future', () => {
      const future = new Date(now.getTime() + 60 * 60 * 1000);
      expect(isTicketOverdue(future, 'open')).toBe(false);
    });
  });

  describe('getTicketAge', () => {
    it('returns hours since createdAt', () => {
      const created = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      expect(getTicketAge(created)).toBe(5);
    });
  });
});

describe('formatDuration', () => {
  it.each([
    [0.4, 'Less than 1 hour'],
    [1, '1 hour'],
    [3, '3 hours'],
    [24, '1 day'],
    [25, '1d 1h'],
    [49, '2d 1h'],
  ])('formats %s hours as %s', (hours, expected) => {
    expect(formatDuration(hours)).toBe(expected);
  });
});

describe('buildQueryString', () => {
  it('skips undefined, null and empty-string values', () => {
    expect(buildQueryString({ a: 'x', b: '', c: null, d: undefined, e: 0 })).toBe('?a=x&e=0');
  });

  it('returns an empty string for an empty input', () => {
    expect(buildQueryString({})).toBe('');
  });
});

describe('needsAttention', () => {
  it('flags urgent/critical open or in-progress tickets', () => {
    expect(needsAttention('urgent', 'open')).toBe(true);
    expect(needsAttention('critical', 'in_progress')).toBe(true);
  });

  it('returns false for low/normal priority', () => {
    expect(needsAttention('low', 'open')).toBe(false);
    expect(needsAttention('normal', 'in_progress')).toBe(false);
  });

  it('returns false when ticket is closed/resolved/escalated/waiting', () => {
    expect(needsAttention('urgent', 'closed')).toBe(false);
    expect(needsAttention('critical', 'resolved')).toBe(false);
  });
});

describe('formatTicketId', () => {
  it('formats ids with a numeric segment as TICK-<last6>', () => {
    expect(formatTicketId('ticket_1234567890_abc123')).toBe('TICK-567890');
  });

  it('falls back to the last 6 characters when the format does not match', () => {
    expect(formatTicketId('abcdefghijklmnop')).toBe('TICK-klmnop');
  });
});
