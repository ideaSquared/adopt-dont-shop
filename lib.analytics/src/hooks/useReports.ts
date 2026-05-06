import { useMutation, useQuery, useQueryClient } from 'react-query';
import { reportService } from '../services/report-service';
import type { ReportConfig } from '../schemas/reports';

/**
 * ADS-105: React Query hooks (react-query v3) over the report API.
 *
 * Query keys: `['reports']` is the list, `['reports', id]` is the
 * single report, `['reports', id, 'execute']` is the executed payload.
 * Mutations invalidate the list key on success — single-report
 * fetches refetch on the next mount.
 *
 * Targets `react-query` ^3.39 to match the existing app.admin /
 * app.rescue / app.client setup. Migration to @tanstack/react-query
 * is tracked separately.
 */

const REPORTS_KEY = 'reports';

export const useReports = (includeArchived = false) =>
  useQuery([REPORTS_KEY, { includeArchived }], () => reportService.list(includeArchived));

export const useReport = (id: string | null) =>
  useQuery([REPORTS_KEY, id], () => reportService.get(id as string), {
    enabled: !!id,
  });

export const useReportTemplates = () =>
  useQuery(['report-templates'], () => reportService.listTemplates());

export const useExecuteSavedReport = (id: string | null) =>
  useQuery([REPORTS_KEY, id, 'execute'], () => reportService.executeSaved(id as string), {
    enabled: !!id,
  });

/**
 * Run an unsaved config — used by the builder's live preview. Returns
 * a mutation rather than a query because the config changes on every
 * keystroke and we want callers to opt-in to refetches.
 */
export const useExecuteReportPreview = () =>
  useMutation((config: ReportConfig) => reportService.executePreview(config));

export const useSaveReport = () => {
  const qc = useQueryClient();
  return useMutation(
    (body: {
      name: string;
      description?: string;
      templateId?: string;
      rescueId?: string | null;
      config: ReportConfig;
    }) => reportService.create(body),
    {
      onSuccess: () => {
        qc.invalidateQueries(REPORTS_KEY);
      },
    }
  );
};

export const useUpdateReport = (id: string) => {
  const qc = useQueryClient();
  return useMutation(
    (patch: {
      name?: string;
      description?: string | null;
      config?: ReportConfig;
      isArchived?: boolean;
    }) => reportService.update(id, patch),
    {
      onSuccess: () => {
        qc.invalidateQueries(REPORTS_KEY);
        qc.invalidateQueries([REPORTS_KEY, id]);
      },
    }
  );
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation((id: string) => reportService.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries(REPORTS_KEY);
    },
  });
};

export const useUpsertSchedule = (reportId: string) => {
  const qc = useQueryClient();
  return useMutation(
    (body: {
      cron: string;
      timezone?: string;
      recipients: Array<{ email: string; userId?: string }>;
      format?: 'pdf' | 'csv' | 'inline-html';
      isEnabled?: boolean;
    }) => reportService.upsertSchedule(reportId, body),
    {
      onSuccess: () => qc.invalidateQueries([REPORTS_KEY, reportId]),
    }
  );
};

export const useDeleteSchedule = (reportId: string) => {
  const qc = useQueryClient();
  return useMutation((scheduleId: string) => reportService.deleteSchedule(scheduleId), {
    onSuccess: () => qc.invalidateQueries([REPORTS_KEY, reportId]),
  });
};

export const useCreateUserShare = (reportId: string) =>
  useMutation((args: { sharedWithUserId: string; permission?: 'view' | 'edit' }) =>
    reportService.createUserShare(reportId, args)
  );

export const useCreateTokenShare = (reportId: string) =>
  useMutation((args: { expiresAt: Date }) => reportService.createTokenShare(reportId, args));

export const useRevokeShare = () =>
  useMutation((shareId: string) => reportService.revokeShare(shareId));
