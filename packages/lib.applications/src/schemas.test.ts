/**
 * ADS C4 (follow-up to PR #676): the adopter dashboard could only display
 * terminal statuses (submitted/approved/rejected/withdrawn) because the
 * shared schema stripped the workflow `stage` the backend tracks. Widening
 * the schema lets clients surface in-progress states like "Home visit
 * scheduled" while the status is still 'submitted'.
 */
import { describe, expect, it } from 'vitest';
import {
  ApplicationSchema,
  ApplicationStageSchema,
  ApplicationStatsSchema,
  ApplicationListResponseSchema,
  RescueApplicationsResponseSchema,
  DocumentUploadSchema,
  ApplicationDataSchema,
} from './schemas';

const baseApplication = {
  id: 'app-1',
  petId: 'pet-1',
  userId: 'user-1',
  rescueId: 'rescue-1',
  status: 'submitted' as const,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('ApplicationSchema stage field', () => {
  it('accepts an application without a stage (backwards compatible)', () => {
    const result = ApplicationSchema.safeParse(baseApplication);
    expect(result.success).toBe(true);
  });

  it.each(['pending', 'reviewing', 'visiting', 'deciding', 'resolved', 'withdrawn'] as const)(
    'accepts the %s stage emitted by the backend',
    (stage) => {
      const result = ApplicationSchema.safeParse({ ...baseApplication, stage });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stage).toBe(stage);
      }
    }
  );

  it('rejects a stage value the backend never emits', () => {
    const result = ApplicationSchema.safeParse({ ...baseApplication, stage: 'home_visit' });
    expect(result.success).toBe(false);
  });
});

describe('ApplicationStageSchema', () => {
  it('exposes the full backend stage enum', () => {
    expect(ApplicationStageSchema.options).toEqual([
      'pending',
      'reviewing',
      'visiting',
      'deciding',
      'resolved',
      'withdrawn',
    ]);
  });
});

describe('ApplicationSchema nullable columns', () => {
  it('accepts null for the four nullable review/submission columns', () => {
    const result = ApplicationSchema.safeParse({
      ...baseApplication,
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an application missing the required identifiers', () => {
    const { id: _id, ...withoutId } = baseApplication;
    const result = ApplicationSchema.safeParse(withoutId);

    expect(result.success).toBe(false);
  });

  it('rejects a status the backend never emits', () => {
    const result = ApplicationSchema.safeParse({ ...baseApplication, status: 'archived' });

    expect(result.success).toBe(false);
  });
});

describe('ApplicationStatsSchema', () => {
  it('fills every counter with zero when the payload is empty', () => {
    const result = ApplicationStatsSchema.parse({});

    expect(result).toEqual({
      total: 0,
      submitted: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      pendingReferences: 0,
    });
  });

  it('preserves supplied counters', () => {
    const result = ApplicationStatsSchema.parse({ total: 3, approved: 2 });

    expect(result.total).toBe(3);
    expect(result.approved).toBe(2);
    expect(result.rejected).toBe(0);
  });
});

describe('ApplicationListResponseSchema', () => {
  it('accepts a bare array of applications', () => {
    const result = ApplicationListResponseSchema.safeParse({ data: [baseApplication] });

    expect(result.success).toBe(true);
  });

  it('accepts the wrapped { applications: [] } shape', () => {
    const result = ApplicationListResponseSchema.safeParse({
      data: { applications: [baseApplication] },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a response with no data envelope at all', () => {
    const result = ApplicationListResponseSchema.safeParse({});

    expect(result.success).toBe(true);
  });
});

describe('RescueApplicationsResponseSchema', () => {
  it('requires the success flag, data array and pagination meta', () => {
    const result = RescueApplicationsResponseSchema.safeParse({
      success: true,
      data: [baseApplication],
      meta: { total: 1, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a response missing the pagination meta', () => {
    const result = RescueApplicationsResponseSchema.safeParse({
      success: true,
      data: [baseApplication],
    });

    expect(result.success).toBe(false);
  });
});

describe('DocumentUploadSchema', () => {
  it('rejects an upload missing the storage url', () => {
    const result = DocumentUploadSchema.safeParse({
      id: 'doc-1',
      filename: 'id.pdf',
      type: 'id_verification',
      uploadedAt: '2025-01-01T00:00:00Z',
    });

    expect(result.success).toBe(false);
  });
});

describe('ApplicationDataSchema permissive coercion', () => {
  // The backend transform emits raw answer strings where the form uses numbers;
  // the read schema must accept both shapes without throwing.
  it('accepts hoursAloneDaily as either a string or a number', () => {
    expect(
      ApplicationDataSchema.safeParse({ petExperience: { hoursAloneDaily: '4-6 hours' } }).success
    ).toBe(true);
    expect(ApplicationDataSchema.safeParse({ petExperience: { hoursAloneDaily: 5 } }).success).toBe(
      true
    );
  });

  it('passes through raw answer records', () => {
    const result = ApplicationDataSchema.safeParse({ answers: { housing_type: 'flat' } });

    expect(result.success).toBe(true);
  });
});
