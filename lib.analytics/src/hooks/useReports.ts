import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/report-service';
import type { ReportConfig } from '../schemas/reports';

/**
 * ADS-105: React Query hooks (@tanstack/react-query v5) over the report API.
 *
 * Query keys: `['reports']` is the list, `['reports', id]` is the
 * single report, `['reports', id, 'execute']` is the executed payload.
 * Mutations invalidate the list key on success — single-report
 * fetches refetch on the next mount.
 */

const REPORTS_KEY = 'reports';

export const useReports = (includeArchived = false) =>
  useQuery({
    queryKey: [REPORTS_KEY, { includeArchived }],
    queryFn: () => reportService.list(includeArchived),
  });

export const useReport = (id: string | null) =>
  useQuery({
    queryKey: [REPORTS_KEY, id],
    queryFn: () => reportService.get(id as string),
    enabled: !!id,
  });

export const useReportTemplates = () =>
  useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportService.listTemplates(),
  });

export const useExecuteSavedReport = (id: string | null) =>
  useQuery({
    queryKey: [REPORTS_KEY, id, 'execute'],
    queryFn: () => reportService.executeSaved(id as string),
    enabled: !!id,
  });

/**
 * Run an unsaved config — used by the builder's live preview. Returns
 * a mutation rather than a query because the config changes on every
 * keystroke and we want callers to opt-in to refetches.
 */
export const useExecuteReportPreview = () =>
  useMutation({
    mutationFn: (config: ReportConfig) => reportService.executePreview(config),
  });

export const useSaveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      templateId?: string;
      rescueId?: string | null;
      config: ReportConfig;
    }) => reportService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [REPORTS_KEY] });
    },
  });
};

export const useUpdateReport = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      name?: string;
      description?: string | null;
      config?: ReportConfig;
      isArchived?: boolean;
    }) => reportService.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [REPORTS_KEY] });
      qc.invalidateQueries({ queryKey: [REPORTS_KEY, id] });
    },
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [REPORTS_KEY] });
    },
  });
};

export const useUpsertSchedule = (reportId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      cron: string;
      timezone?: string;
      recipients: Array<{ email: string; userId?: string }>;
      format?: 'pdf' | 'csv' | 'inline-html';
      isEnabled?: boolean;
    }) => reportService.upsertSchedule(reportId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [REPORTS_KEY, reportId] }),
  });
};

export const useDeleteSchedule = (reportId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => reportService.deleteSchedule(scheduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [REPORTS_KEY, reportId] }),
  });
};

export const useCreateUserShare = (reportId: string) =>
  useMutation({
    mutationFn: (args: { sharedWithUserId: string; permission?: 'view' | 'edit' }) =>
      reportService.createUserShare(reportId, args),
  });

export const useCreateTokenShare = (reportId: string) =>
  useMutation({
    mutationFn: (args: { expiresAt: Date }) => reportService.createTokenShare(reportId, args),
  });

export const useRevokeShare = () =>
  useMutation({ mutationFn: (shareId: string) => reportService.revokeShare(shareId) });
