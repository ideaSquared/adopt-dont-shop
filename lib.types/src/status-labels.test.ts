import { describe, it, expect } from 'vitest';
import {
  applicationStatusLabel,
  applicationStageLabel,
  reportStatusLabel,
  rescueStatusLabel,
  type ReportStatusValue,
} from './status-labels';
import type { ApplicationStatus, ApplicationStage, RescueStatus } from './types/domain-status';

describe('status label functions', () => {
  it('returns a non-empty label for every application status', () => {
    const values: ApplicationStatus[] = ['submitted', 'approved', 'rejected', 'withdrawn'];
    values.forEach(value => {
      const label = applicationStatusLabel(value);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    });
  });

  it('returns a non-empty label for every application stage', () => {
    const values: ApplicationStage[] = [
      'pending',
      'reviewing',
      'visiting',
      'deciding',
      'resolved',
      'withdrawn',
    ];
    values.forEach(value => {
      const label = applicationStageLabel(value);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    });
  });

  it('returns a non-empty label for every report status', () => {
    const values: ReportStatusValue[] = [
      'pending',
      'under_review',
      'resolved',
      'dismissed',
      'escalated',
    ];
    values.forEach(value => {
      const label = reportStatusLabel(value);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    });
  });

  it('returns a non-empty label for every rescue status', () => {
    const values: RescueStatus[] = ['pending', 'verified', 'suspended', 'inactive', 'rejected'];
    values.forEach(value => {
      const label = rescueStatusLabel(value);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    });
  });
});
