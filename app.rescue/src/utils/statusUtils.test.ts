import { describe, expect, it } from 'vitest';
import {
  formatStatusName,
  getStatusColor,
  getStatusDescription,
  getStatusPriority,
  isFinalStatus,
} from './statusUtils';

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

describe('getStatusDescription', () => {
  it('returns the descriptive text for known statuses', () => {
    expect(getStatusDescription('submitted')).toContain('submitted');
    expect(getStatusDescription('approved')).toContain('approved');
    expect(getStatusDescription('withdrawn')).toContain('withdrawn');
  });

  it('returns a generic fallback for unknown statuses', () => {
    expect(getStatusDescription('mystery')).toBe('Status information not available');
  });
});

describe('isFinalStatus', () => {
  it.each([
    ['approved', true],
    ['rejected', true],
    ['withdrawn', true],
    ['submitted', false],
  ])('returns %s for %s', (status, expected) => {
    expect(isFinalStatus(status)).toBe(expected);
  });
});

describe('getStatusPriority', () => {
  it('orders submitted first', () => {
    const statuses = ['rejected', 'submitted', 'approved', 'withdrawn'];
    const sorted = [...statuses].sort((a, b) => getStatusPriority(a) - getStatusPriority(b));
    expect(sorted).toEqual(['submitted', 'approved', 'rejected', 'withdrawn']);
  });

  it('returns a high fallback for unknown statuses so they sort last', () => {
    expect(getStatusPriority('mystery')).toBeGreaterThan(getStatusPriority('withdrawn'));
  });
});
