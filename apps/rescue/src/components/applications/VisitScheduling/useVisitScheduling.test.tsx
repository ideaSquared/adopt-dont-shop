import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from '@adopt-dont-shop/lib.components';
import { QueryWrapper } from '../../../hooks/query-test-wrapper';
import { useVisitScheduling } from './useVisitScheduling';

const setup = (onUpdateVisit = vi.fn().mockResolvedValue(undefined)) => {
  const onScheduleVisit = vi.fn().mockResolvedValue(undefined);
  const onRefresh = vi.fn();
  const hook = renderHook(() => useVisitScheduling({ onScheduleVisit, onUpdateVisit, onRefresh }), {
    wrapper: QueryWrapper,
  });
  return { ...hook, onScheduleVisit, onUpdateVisit, onRefresh };
};

describe('useVisitScheduling', () => {
  it('schedules a visit, then clears and closes the form and refreshes', async () => {
    const { result, onScheduleVisit, onRefresh } = setup();
    act(() => {
      result.current.setShowScheduleVisit(true);
      result.current.setVisitForm({
        scheduledDate: '2026-06-01',
        scheduledTime: '10:00',
        assignedStaff: 'Jane Smith',
        notes: 'Side gate',
      });
    });

    act(() => result.current.handleScheduleVisit());

    await waitFor(() => expect(result.current.showScheduleVisit).toBe(false));
    expect(onScheduleVisit).toHaveBeenCalledWith({
      scheduledDate: '2026-06-01',
      scheduledTime: '10:00',
      assignedStaff: 'Jane Smith',
      notes: 'Side gate',
    });
    expect(result.current.visitForm).toEqual(result.current.EMPTY_VISIT_FORM);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('cancels a visit with the trimmed reason and closes the cancel dialog', async () => {
    const { result, onUpdateVisit } = setup();
    act(() => {
      result.current.setCancellingVisit('visit-1');
      result.current.setCancelReason('  Family emergency ');
    });

    act(() => result.current.handleCancelVisit('visit-1'));

    await waitFor(() => expect(result.current.cancellingVisit).toBeNull());
    expect(onUpdateVisit).toHaveBeenCalledWith(
      'visit-1',
      expect.objectContaining({ status: 'cancelled', cancelReason: 'Family emergency' })
    );
  });

  it('does not cancel without a reason', () => {
    const { result, onUpdateVisit } = setup();

    act(() => result.current.handleCancelVisit('visit-1'));

    expect(onUpdateVisit).not.toHaveBeenCalled();
  });

  it('reports a failed update and keeps the dialog open', async () => {
    const { result } = setup(vi.fn().mockRejectedValue(new Error('boom')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => {
      result.current.setCancellingVisit('visit-1');
      result.current.setCancelReason('Family emergency');
    });

    act(() => result.current.handleCancelVisit('visit-1'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to cancel visit: boom',
        expect.objectContaining({ action: expect.objectContaining({ label: 'Retry' }) })
      )
    );
    expect(result.current.cancellingVisit).toBe('visit-1');
  });
});
