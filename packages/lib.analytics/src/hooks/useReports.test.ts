import {
  useReports,
  useReport,
  useReportTemplates,
  useExecuteSavedReport,
  useExecuteReportPreview,
  useSaveReport,
  useUpdateReport,
  useDeleteReport,
  useUpsertSchedule,
  useDeleteSchedule,
  useCreateUserShare,
  useCreateTokenShare,
  useRevokeShare,
} from './useReports';
import { reportService } from '../services/report-service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReportConfig } from '../schemas/reports';

// The hooks are thin wrappers over react-query. Rather than render them (no
// react-dom / testing-library in this package), we capture the option object
// passed to useQuery/useMutation and exercise its queryFn/mutationFn/onSuccess
// — the actual behaviour the hooks define.
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
}));

vi.mock('../services/report-service', () => ({
  reportService: {
    list: vi.fn(),
    get: vi.fn(),
    listTemplates: vi.fn(),
    executeSaved: vi.fn(),
    executePreview: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    upsertSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    createUserShare: vi.fn(),
    createTokenShare: vi.fn(),
    revokeShare: vi.fn(),
  },
}));

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => unknown;
  enabled?: boolean;
};

type MutationOptions = {
  mutationFn: (arg: unknown) => unknown;
  onSuccess?: () => void;
};

const mockedReportService = vi.mocked(reportService);
const invalidateQueries = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useQueryClient).mockReturnValue({
    invalidateQueries,
  } as unknown as ReturnType<typeof useQueryClient>);
});

const config: ReportConfig = {
  filters: { groupBy: 'day' },
  layout: { columns: 1 },
  widgets: [
    {
      id: '634d3ff9-634a-40e8-8ef5-efd55e37d4b1',
      title: 'W',
      position: { x: 0, y: 0, w: 4, h: 3 },
      metric: 'adoption',
      chartType: 'metric-card',
      options: { valueKey: 'count', label: 'Count' },
    },
  ],
};

describe('useReports', () => {
  it('keys on the includeArchived flag and lists via the service', () => {
    const options = useReports(true) as unknown as QueryOptions;

    expect(options.queryKey).toEqual(['reports', { includeArchived: true }]);
    options.queryFn();
    expect(mockedReportService.list).toHaveBeenCalledWith(true);
  });

  it('defaults includeArchived to false', () => {
    const options = useReports() as unknown as QueryOptions;
    options.queryFn();
    expect(mockedReportService.list).toHaveBeenCalledWith(false);
  });
});

describe('useReport', () => {
  it('is disabled and does not key on a missing id', () => {
    const options = useReport(null) as unknown as QueryOptions;
    expect(options.enabled).toBe(false);
  });

  it('fetches a single report when an id is present', () => {
    const options = useReport('abc') as unknown as QueryOptions;
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual(['reports', 'abc']);
    options.queryFn();
    expect(mockedReportService.get).toHaveBeenCalledWith('abc');
  });
});

describe('useReportTemplates', () => {
  it('lists templates under its own key', () => {
    const options = useReportTemplates() as unknown as QueryOptions;
    expect(options.queryKey).toEqual(['report-templates']);
    options.queryFn();
    expect(mockedReportService.listTemplates).toHaveBeenCalled();
  });
});

describe('useExecuteSavedReport', () => {
  it('is disabled without an id', () => {
    const options = useExecuteSavedReport(null) as unknown as QueryOptions;
    expect(options.enabled).toBe(false);
  });

  it('executes the saved report and keys on execute', () => {
    const options = useExecuteSavedReport('rid') as unknown as QueryOptions;
    expect(options.queryKey).toEqual(['reports', 'rid', 'execute']);
    options.queryFn();
    expect(mockedReportService.executeSaved).toHaveBeenCalledWith('rid');
  });
});

describe('useExecuteReportPreview', () => {
  it('runs an unsaved config as a mutation', () => {
    const options = useExecuteReportPreview() as unknown as MutationOptions;
    options.mutationFn(config);
    expect(mockedReportService.executePreview).toHaveBeenCalledWith(config);
  });
});

describe('useSaveReport', () => {
  it('creates a report and invalidates the list on success', () => {
    const options = useSaveReport() as unknown as MutationOptions;
    const body = { name: 'R', config };
    options.mutationFn(body);
    expect(mockedReportService.create).toHaveBeenCalledWith(body);

    options.onSuccess?.();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports'] });
  });
});

describe('useUpdateReport', () => {
  it('updates a report and invalidates both list and single keys', () => {
    const options = useUpdateReport('rid') as unknown as MutationOptions;
    options.mutationFn({ name: 'New' });
    expect(mockedReportService.update).toHaveBeenCalledWith('rid', { name: 'New' });

    options.onSuccess?.();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports', 'rid'] });
  });
});

describe('useDeleteReport', () => {
  it('removes a report and invalidates the list', () => {
    const options = useDeleteReport() as unknown as MutationOptions;
    options.mutationFn('rid');
    expect(mockedReportService.remove).toHaveBeenCalledWith('rid');

    options.onSuccess?.();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports'] });
  });
});

describe('useUpsertSchedule', () => {
  it('upserts a schedule and invalidates the single report key', () => {
    const options = useUpsertSchedule('rid') as unknown as MutationOptions;
    const body = { cron: '0 9 * * 1', recipients: [{ email: 'a@b.com' }] };
    options.mutationFn(body);
    expect(mockedReportService.upsertSchedule).toHaveBeenCalledWith('rid', body);

    options.onSuccess?.();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports', 'rid'] });
  });
});

describe('useDeleteSchedule', () => {
  it('deletes a schedule and invalidates the single report key', () => {
    const options = useDeleteSchedule('rid') as unknown as MutationOptions;
    options.mutationFn('sched-1');
    expect(mockedReportService.deleteSchedule).toHaveBeenCalledWith('sched-1');

    options.onSuccess?.();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports', 'rid'] });
  });
});

describe('share hooks', () => {
  it('creates a user share', () => {
    const options = useCreateUserShare('rid') as unknown as MutationOptions;
    const args = { sharedWithUserId: 'u1', permission: 'view' as const };
    options.mutationFn(args);
    expect(mockedReportService.createUserShare).toHaveBeenCalledWith('rid', args);
  });

  it('creates a token share', () => {
    const options = useCreateTokenShare('rid') as unknown as MutationOptions;
    const args = { expiresAt: new Date('2026-02-01T00:00:00.000Z') };
    options.mutationFn(args);
    expect(mockedReportService.createTokenShare).toHaveBeenCalledWith('rid', args);
  });

  it('revokes a share', () => {
    const options = useRevokeShare() as unknown as MutationOptions;
    options.mutationFn('share-1');
    expect(mockedReportService.revokeShare).toHaveBeenCalledWith('share-1');
  });
});
