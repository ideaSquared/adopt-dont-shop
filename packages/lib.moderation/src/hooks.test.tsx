import { describe, it, expect, vi, type Mocked } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useReports,
  useReportDetail,
  useModerationMetrics,
  useActiveActions,
  useReportMutations,
} from './hooks';
import { moderationService } from './moderation-service';
import type { Report, ModeratorAction } from './schemas';

vi.mock('./moderation-service', () => ({
  moderationService: {
    getReports: vi.fn(),
    getReportById: vi.fn(),
    getMetrics: vi.fn(),
    getActiveActions: vi.fn(),
    createReport: vi.fn(),
    updateReportStatus: vi.fn(),
    resolveReport: vi.fn(),
    dismissReport: vi.fn(),
    escalateReport: vi.fn(),
    bulkUpdateReports: vi.fn(),
    takeAction: vi.fn(),
  },
}));

const mockedService = moderationService as Mocked<typeof moderationService>;

const report = { reportId: 'rep_1', status: 'pending' } as Report;
const action = { actionId: 'act_1' } as ModeratorAction;

describe('useReports', () => {
  it('loads reports and exposes them once resolved', async () => {
    const response = {
      data: [report],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    mockedService.getReports.mockResolvedValue(response);

    const { result } = renderHook(() => useReports());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(response);
    expect(result.current.error).toBeNull();
  });

  it('passes filters straight through to the service', async () => {
    mockedService.getReports.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const filters = { status: 'pending' } as never;
    renderHook(() => useReports(filters));

    await waitFor(() => expect(mockedService.getReports).toHaveBeenCalledWith(filters));
  });

  it('captures the error when the service rejects', async () => {
    mockedService.getReports.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useReports());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('re-fetches on demand via refetch', async () => {
    mockedService.getReports.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useReports());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockedService.getReports).toHaveBeenCalledTimes(2);
  });
});

describe('useReportDetail', () => {
  it('loads a single report by id', async () => {
    mockedService.getReportById.mockResolvedValue(report);

    const { result } = renderHook(() => useReportDetail('rep_1'));

    await waitFor(() => expect(result.current.data).toEqual(report));
    expect(mockedService.getReportById).toHaveBeenCalledWith('rep_1');
  });

  it('does not call the service when the id is empty', async () => {
    const { result } = renderHook(() => useReportDetail(''));

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(mockedService.getReportById).not.toHaveBeenCalled();
  });

  it('captures the error when the lookup rejects', async () => {
    mockedService.getReportById.mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useReportDetail('rep_1'));

    await waitFor(() => expect(result.current.error?.message).toBe('not found'));
  });
});

describe('useModerationMetrics', () => {
  it('loads metrics on mount', async () => {
    const metrics = { totalReports: 3 } as never;
    mockedService.getMetrics.mockResolvedValue(metrics);

    const { result } = renderHook(() => useModerationMetrics());

    await waitFor(() => expect(result.current.data).toEqual(metrics));
  });

  it('captures the error when metrics fail to load', async () => {
    mockedService.getMetrics.mockRejectedValue(new Error('metrics down'));

    const { result } = renderHook(() => useModerationMetrics());

    await waitFor(() => expect(result.current.error?.message).toBe('metrics down'));
  });
});

describe('useActiveActions', () => {
  it('loads active actions scoped to a target user', async () => {
    mockedService.getActiveActions.mockResolvedValue([action]);

    const { result } = renderHook(() => useActiveActions('user_2'));

    await waitFor(() => expect(result.current.data).toEqual([action]));
    expect(mockedService.getActiveActions).toHaveBeenCalledWith('user_2');
  });

  it('captures the error when the actions request rejects', async () => {
    mockedService.getActiveActions.mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useActiveActions());

    await waitFor(() => expect(result.current.error?.message).toBe('nope'));
  });
});

describe('useReportMutations', () => {
  it('creates a report through the service', async () => {
    mockedService.createReport.mockResolvedValue(report);

    const { result } = renderHook(() => useReportMutations());

    let created: Report | undefined;
    await act(async () => {
      created = await result.current.createReport({ title: 'x' } as never);
    });

    expect(created).toEqual(report);
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces and rethrows errors from a mutation', async () => {
    mockedService.createReport.mockRejectedValue(new Error('create failed'));

    const { result } = renderHook(() => useReportMutations());

    await act(async () => {
      await expect(result.current.createReport({ title: 'x' } as never)).rejects.toThrow(
        'create failed'
      );
    });

    await waitFor(() => expect(result.current.error?.message).toBe('create failed'));
  });

  it('updates a report status', async () => {
    mockedService.updateReportStatus.mockResolvedValue(report);

    const { result } = renderHook(() => useReportMutations());
    await act(async () => {
      await result.current.updateStatus('rep_1', { status: 'resolved' });
    });

    expect(mockedService.updateReportStatus).toHaveBeenCalledWith('rep_1', { status: 'resolved' });
  });

  it('resolves a report', async () => {
    mockedService.resolveReport.mockResolvedValue(report);

    const { result } = renderHook(() => useReportMutations());
    await act(async () => {
      await result.current.resolveReport('rep_1', 'done');
    });

    expect(mockedService.resolveReport).toHaveBeenCalledWith('rep_1', 'done', undefined);
  });

  it('dismisses a report', async () => {
    mockedService.dismissReport.mockResolvedValue(report);

    const { result } = renderHook(() => useReportMutations());
    await act(async () => {
      await result.current.dismissReport('rep_1', 'nope');
    });

    expect(mockedService.dismissReport).toHaveBeenCalledWith('rep_1', 'nope');
  });

  it('escalates a report', async () => {
    mockedService.escalateReport.mockResolvedValue(report);

    const { result } = renderHook(() => useReportMutations());
    await act(async () => {
      await result.current.escalateReport('rep_1', {
        escalatedTo: 'lead_1',
        reason: 'serious enough to escalate',
      });
    });

    expect(mockedService.escalateReport).toHaveBeenCalledWith('rep_1', {
      escalatedTo: 'lead_1',
      reason: 'serious enough to escalate',
    });
  });

  it('bulk-updates reports', async () => {
    mockedService.bulkUpdateReports.mockResolvedValue({ success: true, updated: 2 });

    const { result } = renderHook(() => useReportMutations());
    let outcome: { success: boolean; updated: number } | undefined;
    await act(async () => {
      outcome = await result.current.bulkUpdate({ reportIds: ['rep_1'], action: 'resolve' });
    });

    expect(outcome).toEqual({ success: true, updated: 2 });
  });

  it('takes action on a report', async () => {
    mockedService.takeAction.mockResolvedValue({ report, action });

    const { result } = renderHook(() => useReportMutations());
    let outcome: { report: Report; action: ModeratorAction } | undefined;
    await act(async () => {
      outcome = await result.current.takeAction('rep_1', { actionType: 'warning_issued' } as never);
    });

    expect(outcome).toEqual({ report, action });
  });
});
