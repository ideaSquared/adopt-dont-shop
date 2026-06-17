/**
 * Behaviour tests for useApplicationDetails — the hook behind the application
 * review modal. It loads the applicant record plus its sub-resources
 * (references, home visits, timeline) in parallel, isolates sub-resource
 * failures so one broken section doesn't blank the modal, and exposes
 * mutations that refetch on success.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  getApplicationById: vi.fn(),
  getReferenceChecks: vi.fn(),
  getHomeVisits: vi.fn(),
  getApplicationTimeline: vi.fn(),
  updateReferenceCheck: vi.fn(),
  scheduleHomeVisit: vi.fn(),
  updateHomeVisit: vi.fn(),
  addTimelineEvent: vi.fn(),
  transitionStage: vi.fn(),
}));

vi.mock('../services/applicationService', () => ({
  RescueApplicationService: class {
    getApplicationById = serviceMocks.getApplicationById;
    getReferenceChecks = serviceMocks.getReferenceChecks;
    getHomeVisits = serviceMocks.getHomeVisits;
    getApplicationTimeline = serviceMocks.getApplicationTimeline;
    updateReferenceCheck = serviceMocks.updateReferenceCheck;
    scheduleHomeVisit = serviceMocks.scheduleHomeVisit;
    updateHomeVisit = serviceMocks.updateHomeVisit;
    addTimelineEvent = serviceMocks.addTimelineEvent;
    transitionStage = serviceMocks.transitionStage;
  },
}));

import { useApplicationDetails } from './useApplications';

const setHappyPath = () => {
  serviceMocks.getApplicationById.mockResolvedValue({ id: 'app1', status: 'submitted' });
  serviceMocks.getReferenceChecks.mockResolvedValue([{ id: 'ref1' }]);
  serviceMocks.getHomeVisits.mockResolvedValue([{ id: 'hv1' }]);
  serviceMocks.getApplicationTimeline.mockResolvedValue([{ id: 't1' }]);
};

describe('useApplicationDetails', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setHappyPath();
  });

  it('does not fetch when no application id is provided', async () => {
    const { result } = renderHook(() => useApplicationDetails(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(serviceMocks.getApplicationById).not.toHaveBeenCalled();
    expect(result.current.application).toBeNull();
  });

  it('loads the application and all sub-resources', async () => {
    const { result } = renderHook(() => useApplicationDetails('app1'));

    await waitFor(() => expect(result.current.application).not.toBeNull());

    expect(serviceMocks.getApplicationById).toHaveBeenCalledWith('app1');
    expect(result.current.references).toEqual([{ id: 'ref1' }]);
    expect(result.current.homeVisits).toEqual([{ id: 'hv1' }]);
    expect(result.current.timeline).toEqual([{ id: 't1' }]);
    expect(result.current.error).toBeNull();
  });

  it('isolates a references failure without losing the rest of the modal', async () => {
    serviceMocks.getReferenceChecks.mockRejectedValue(new Error('refs down'));

    const { result } = renderHook(() => useApplicationDetails('app1'));

    await waitFor(() => expect(result.current.referencesError).toBe('refs down'));
    expect(result.current.application).not.toBeNull();
    expect(result.current.references).toEqual([]);
    expect(result.current.timeline).toEqual([{ id: 't1' }]);
    expect(result.current.error).toBeNull();
  });

  it('isolates home-visit and timeline failures independently', async () => {
    serviceMocks.getHomeVisits.mockRejectedValue(new Error('visits down'));
    serviceMocks.getApplicationTimeline.mockRejectedValue(new Error('timeline down'));

    const { result } = renderHook(() => useApplicationDetails('app1'));

    await waitFor(() => expect(result.current.homeVisitsError).toBe('visits down'));
    expect(result.current.timelineError).toBe('timeline down');
    expect(result.current.application).not.toBeNull();
  });

  it('sets a top-level error when the main application fetch fails', async () => {
    serviceMocks.getApplicationById.mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useApplicationDetails('app1'));

    await waitFor(() => expect(result.current.error).toBe('not found'));
  });

  it('updates a reference check then refetches', async () => {
    serviceMocks.updateReferenceCheck.mockResolvedValue(undefined);
    const { result } = renderHook(() => useApplicationDetails('app1'));
    await waitFor(() => expect(result.current.application).not.toBeNull());

    await act(async () => {
      await result.current.updateReferenceCheck('ref1', 'verified', 'ok');
    });

    expect(serviceMocks.updateReferenceCheck).toHaveBeenCalledWith(
      'app1',
      'ref1',
      'verified',
      'ok'
    );
    expect(serviceMocks.getApplicationById).toHaveBeenCalledTimes(2);
  });

  it('schedules a home visit then refetches', async () => {
    serviceMocks.scheduleHomeVisit.mockResolvedValue(undefined);
    const { result } = renderHook(() => useApplicationDetails('app1'));
    await waitFor(() => expect(result.current.application).not.toBeNull());

    const visit = {
      scheduledDate: '2024-07-01',
      scheduledTime: '10:00',
      assignedStaff: 'staff1',
    };
    await act(async () => {
      await result.current.scheduleHomeVisit(visit);
    });

    expect(serviceMocks.scheduleHomeVisit).toHaveBeenCalledWith('app1', visit);
  });

  it('adds a timeline event then refetches', async () => {
    serviceMocks.addTimelineEvent.mockResolvedValue(undefined);
    const { result } = renderHook(() => useApplicationDetails('app1'));
    await waitFor(() => expect(result.current.application).not.toBeNull());

    await act(async () => {
      await result.current.addTimelineEvent('note', 'A note');
    });

    expect(serviceMocks.addTimelineEvent).toHaveBeenCalledWith('app1', 'note', 'A note', undefined);
  });

  it('transitions stage and rethrows on failure so the modal can react', async () => {
    serviceMocks.transitionStage.mockRejectedValue(new Error('transition failed'));
    const { result } = renderHook(() => useApplicationDetails('app1'));
    await waitFor(() => expect(result.current.application).not.toBeNull());

    let thrown: unknown;
    await act(async () => {
      await result.current
        .transitionStage({ type: 'approve', nextStage: 'approved' } as never, 'notes')
        .catch((err: unknown) => {
          thrown = err;
        });
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('transition failed');
    await waitFor(() => expect(result.current.error).toBe('transition failed'));
  });

  it('surfaces an update error without throwing for reference updates', async () => {
    serviceMocks.updateReferenceCheck.mockRejectedValue(new Error('update failed'));
    const { result } = renderHook(() => useApplicationDetails('app1'));
    await waitFor(() => expect(result.current.application).not.toBeNull());

    await act(async () => {
      await result.current.updateReferenceCheck('ref1', 'verified');
    });

    expect(result.current.error).toBe('update failed');
  });
});
