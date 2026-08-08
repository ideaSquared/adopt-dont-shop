/**
 * Analytics Service for comprehensive reporting and analytics data
 * Provides metrics, charts, and export functionality for the Analytics dashboard
 */

import { apiService } from './libraryServices';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AdoptionMetrics {
  totalAdoptions: number;
  successRate: number;
  averageTimeToAdoption: number;
  adoptionTrends: {
    date: string;
    count: number;
  }[];
  comparisonPeriod: {
    totalAdoptions: number;
    successRate: number;
    percentageChange: number;
  };
}

export interface ApplicationAnalytics {
  totalApplications: number;
  conversionRateByStage: {
    stage: string;
    conversionRate: number;
    applicationsCount: number;
  }[];
}

export interface PetPerformance {
  mostPopularBreeds: {
    breed: string;
    count: number;
    averageAdoptionTime: number;
  }[];
}

export interface StageDistribution {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ReportFilters {
  dateRange?: DateRange;
  petType?: string;
  rescueLocation?: string;
  staffMemberId?: string;
}

export class AnalyticsService {
  /**
   * Get adoption metrics for the specified date range
   */
  async getAdoptionMetrics(dateRange: DateRange, comparison?: DateRange): Promise<AdoptionMetrics> {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      if (comparison) {
        params.append('comparisonStart', comparison.start.toISOString());
        params.append('comparisonEnd', comparison.end.toISOString());
      }

      const response = await apiService.get<{ success: boolean; data: AdoptionMetrics }>(
        `/api/v1/analytics/adoption-metrics?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch adoption metrics:', error);
      throw error;
    }
  }

  /**
   * Get application analytics including conversion rates and bottlenecks
   */
  async getApplicationAnalytics(dateRange: DateRange): Promise<ApplicationAnalytics> {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await apiService.get<{ success: boolean; data: ApplicationAnalytics }>(
        `/api/v1/analytics/application-analytics?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch application analytics:', error);
      throw error;
    }
  }

  /**
   * Get pet performance metrics
   */
  async getPetPerformance(dateRange: DateRange): Promise<PetPerformance> {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await apiService.get<{ success: boolean; data: PetPerformance }>(
        `/api/v1/analytics/pet-performance?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch pet performance:', error);
      throw error;
    }
  }

  /**
   * Get stage distribution for applications
   */
  async getStageDistribution(): Promise<StageDistribution[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: StageDistribution[] }>(
        '/api/v1/analytics/stage-distribution'
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch stage distribution:', error);
      throw error;
    }
  }

  /**
   * Export analytics data to CSV
   */
  async exportToCSV(reportType: string, filters: ReportFilters): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>('/api/v1/analytics/export/csv', {
        reportType,
        filters,
      });

      return response;
    } catch (error) {
      console.error('Failed to export to CSV:', error);
      throw error;
    }
  }

  /**
   * Export analytics data to PDF
   */
  async exportToPDF(reportType: string, filters: ReportFilters): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>('/api/v1/analytics/export/pdf', {
        reportType,
        filters,
      });

      return response;
    } catch (error) {
      console.error('Failed to export to PDF:', error);
      throw error;
    }
  }

  /**
   * Email a report to specified recipients
   */
  async emailReport(
    reportType: string,
    filters: ReportFilters,
    recipients: string[]
  ): Promise<void> {
    try {
      await apiService.post('/api/v1/analytics/email-report', {
        reportType,
        filters,
        recipients,
      });
    } catch (error) {
      console.error('Failed to email report:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
