/**
 * ADS C4 (follow-up to PR #676): the adopter dashboard could only display
 * terminal statuses (submitted/approved/rejected/withdrawn) because the
 * shared schema stripped the workflow `stage` the backend tracks. Widening
 * the schema lets clients surface in-progress states like "Home visit
 * scheduled" while the status is still 'submitted'.
 */
import { describe, expect, it } from 'vitest';
import { ApplicationSchema, ApplicationStageSchema } from './schemas';

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
