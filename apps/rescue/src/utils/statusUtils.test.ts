import { describe, expect, it } from 'vitest';
import { formatStatusName, getStatusColor } from './statusUtils';

describe('formatStatusName', () => {
  it.each([
    ['submitted', 'Submitted'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['withdrawn', 'Withdrawn'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatStatusName(input)).toBe(expected);
  });

  it('falls back to title case for unknown statuses', () => {
    expect(formatStatusName('pending_review')).toBe('Pending Review');
    expect(formatStatusName('escalated_to_admin')).toBe('Escalated To Admin');
  });
});

describe('getStatusColor', () => {
  it.each([
    ['approved', 'success'],
    ['rejected', 'danger'],
    ['submitted', 'primary'],
    ['withdrawn', 'secondary'],
  ])('maps %s to %s', (input, expected) => {
    expect(getStatusColor(input)).toBe(expected);
  });

  it('returns secondary for unknown statuses', () => {
    expect(getStatusColor('mystery')).toBe('secondary');
  });
});
