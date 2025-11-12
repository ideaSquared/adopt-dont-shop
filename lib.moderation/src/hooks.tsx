import { useState, useEffect, useCallback } from 'react';
import { moderationService } from './moderation-service';
import type {
  Report,
  ReportFilters,
  ReportsResponse,
  ModerationMetrics,
  ModeratorAction,
  CreateReportRequest,
  UpdateReportStatusRequest,
  CreateModeratorActionRequest,
  EscalateReportRequest,
  BulkUpdateReportsRequest,
} from './schemas';

type UseQueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

/**
 * Hook for fetching reports with filters
 */
export const useReports = (filters?: ReportFilters): UseQueryState<ReportsResponse> => {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize filters to string for stable dependency comparison
  const filtersKey = JSON.stringify(filters || {});

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await moderationService.getReports(filters);
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]); // Use serialized key instead of object reference

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchReports,
  };
};

/**
 * Hook for fetching a single report by ID
 */
export const useReportDetail = (reportId: string): UseQueryState<Report> => {
  const [data, setData] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReport = useCallback(async () => {
    if (!reportId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const report = await moderationService.getReportById(reportId);
      setData(report);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchReport,
  };
};

/**
 * Hook for fetching moderation metrics
 */
export const useModerationMetrics = (): UseQueryState<ModerationMetrics> => {
  const [data, setData] = useState<ModerationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const metrics = await moderationService.getMetrics();
      setData(metrics);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
};

/**
 * Hook for fetching active moderation actions
 */
export const useActiveActions = (): UseQueryState<ModeratorAction[]> => {
  const [data, setData] = useState<ModeratorAction[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const actions = await moderationService.getActiveActions();
      setData(actions);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchActions,
  };
};

/**
 * Hook for managing report mutations (create, update, resolve, dismiss)
 */
export const useReportMutations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createReport = async (data: CreateReportRequest): Promise<Report> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await moderationService.createReport(data);
      return report;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (
    reportId: string,
    data: UpdateReportStatusRequest
  ): Promise<Report> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await moderationService.updateReportStatus(reportId, data);
      return report;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resolveReport = async (
    reportId: string,
    notes?: string,
    actionData?: CreateModeratorActionRequest
  ): Promise<Report> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await moderationService.resolveReport(reportId, notes, actionData);
      return report;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const dismissReport = async (reportId: string, notes?: string): Promise<Report> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await moderationService.dismissReport(reportId, notes);
      return report;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const escalateReport = async (reportId: string, data: EscalateReportRequest): Promise<Report> => {
    try {
      setIsLoading(true);
      setError(null);
      const report = await moderationService.escalateReport(reportId, data);
      return report;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkUpdate = async (
    data: BulkUpdateReportsRequest
  ): Promise<{ success: boolean; updated: number }> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await moderationService.bulkUpdateReports(data);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const takeAction = async (
    reportId: string,
    actionData: CreateModeratorActionRequest,
    resolutionNotes?: string
  ): Promise<{ report: Report; action: ModeratorAction }> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await moderationService.takeAction(reportId, actionData, resolutionNotes);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createReport,
    updateStatus,
    resolveReport,
    dismissReport,
    escalateReport,
    bulkUpdate,
    takeAction,
  };
};
