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
  comparisonPeriod?: {
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
  averageTimePerStage: {
    stage: string;
    averageHours: number;
  }[];
  bottlenecks: {
    stage: string;
    delayHours: number;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export interface PetPerformance {
  mostPopularBreeds: {
    breed: string;
    count: number;
    averageAdoptionTime: number;
  }[];
  adoptionRatesBySpecies: {
    species: string;
    adoptionRate: number;
    totalCount: number;
  }[];
  averageTimeToAdoption: {
    species: string;
    days: number;
  }[];
}

export interface ResponseTimeMetrics {
  averageResponseTime: number; // in hours
  slaCompliance: number; // percentage
  responseTimeByStage: {
    stage: string;
    averageHours: number;
    slaTarget: number;
  }[];
  staffPerformance: {
    staffId: string;
    staffName: string;
    averageResponseTime: number;
    applicationsHandled: number;
    slaCompliance: number;
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

export interface CustomReport {
  id?: string;
  name: string;
  metrics: string[];
  visualizations: string[];
  filters: ReportFilters;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
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
      // Return mock data for development
      return this.getMockAdoptionMetrics(dateRange);
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
      return this.getMockApplicationAnalytics();
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
      return this.getMockPetPerformance();
    }
  }

  /**
   * Get response time metrics and staff performance
   */
  async getResponseTimeMetrics(dateRange: DateRange): Promise<ResponseTimeMetrics> {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await apiService.get<{ success: boolean; data: ResponseTimeMetrics }>(
        `/api/v1/analytics/response-time?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch response time metrics:', error);
      return this.getMockResponseTimeMetrics();
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
      return this.getMockStageDistribution();
    }
  }

  /**
   * Export analytics data to CSV
   */
  async exportToCSV(reportType: string, filters: ReportFilters): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>(
        '/api/v1/analytics/export/csv',
        {
          reportType,
          filters,
        },
        {
          responseType: 'blob',
        }
      );

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
      const response = await apiService.post<Blob>(
        '/api/v1/analytics/export/pdf',
        {
          reportType,
          filters,
        },
        {
          responseType: 'blob',
        }
      );

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

  /**
   * Save a custom report template
   */
  async saveCustomReport(report: CustomReport): Promise<CustomReport> {
    try {
      const response = await apiService.post<{ success: boolean; data: CustomReport }>(
        '/api/v1/analytics/custom-reports',
        report
      );

      return response.data;
    } catch (error) {
      console.error('Failed to save custom report:', error);
      throw error;
    }
  }

  /**
   * Get saved custom reports
   */
  async getCustomReports(): Promise<CustomReport[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: CustomReport[] }>(
        '/api/v1/analytics/custom-reports'
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch custom reports:', error);
      return [];
    }
  }

  /**
   * Delete a custom report
   */
  async deleteCustomReport(reportId: string): Promise<void> {
    try {
      await apiService.delete(`/api/v1/analytics/custom-reports/${reportId}`);
    } catch (error) {
      console.error('Failed to delete custom report:', error);
      throw error;
    }
  }

  // Mock data methods for development

  private getMockAdoptionMetrics(dateRange: DateRange): AdoptionMetrics {
    const days = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const trends = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10) + 1,
      };
    });

    const totalAdoptions = trends.reduce((sum, t) => sum + t.count, 0);

    return {
      totalAdoptions,
      successRate: 78.5,
      averageTimeToAdoption: 14.2,
      adoptionTrends: trends,
      comparisonPeriod: {
        totalAdoptions: Math.floor(totalAdoptions * 0.85),
        successRate: 72.3,
        percentageChange: 15.2,
      },
    };
  }

  private getMockApplicationAnalytics(): ApplicationAnalytics {
    return {
      totalApplications: 156,
      conversionRateByStage: [
        { stage: 'Submitted', conversionRate: 100, applicationsCount: 156 },
        { stage: 'Under Review', conversionRate: 82.1, applicationsCount: 128 },
        { stage: 'Interview Scheduled', conversionRate: 71.8, applicationsCount: 112 },
        { stage: 'Home Visit', conversionRate: 58.3, applicationsCount: 91 },
        { stage: 'Approved', conversionRate: 48.1, applicationsCount: 75 },
        { stage: 'Adopted', conversionRate: 42.3, applicationsCount: 66 },
      ],
      averageTimePerStage: [
        { stage: 'Submitted', averageHours: 2.5 },
        { stage: 'Under Review', averageHours: 48.0 },
        { stage: 'Interview Scheduled', averageHours: 72.0 },
        { stage: 'Home Visit', averageHours: 96.0 },
        { stage: 'Approved', averageHours: 24.0 },
      ],
      bottlenecks: [
        { stage: 'Home Visit', delayHours: 120.5, severity: 'high' },
        { stage: 'Interview Scheduled', delayHours: 85.2, severity: 'medium' },
        { stage: 'Under Review', delayHours: 52.8, severity: 'low' },
      ],
    };
  }

  private getMockPetPerformance(): PetPerformance {
    return {
      mostPopularBreeds: [
        { breed: 'Labrador Retriever', count: 24, averageAdoptionTime: 12.5 },
        { breed: 'Domestic Shorthair', count: 18, averageAdoptionTime: 15.2 },
        { breed: 'German Shepherd', count: 15, averageAdoptionTime: 18.7 },
        { breed: 'Siamese', count: 12, averageAdoptionTime: 14.1 },
        { breed: 'Golden Retriever', count: 10, averageAdoptionTime: 10.3 },
      ],
      adoptionRatesBySpecies: [
        { species: 'Dog', adoptionRate: 82.5, totalCount: 145 },
        { species: 'Cat', adoptionRate: 75.3, totalCount: 98 },
        { species: 'Rabbit', adoptionRate: 68.2, totalCount: 22 },
        { species: 'Other', adoptionRate: 55.6, totalCount: 18 },
      ],
      averageTimeToAdoption: [
        { species: 'Dog', days: 14.2 },
        { species: 'Cat', days: 16.8 },
        { species: 'Rabbit', days: 21.5 },
        { species: 'Other', days: 28.3 },
      ],
    };
  }

  private getMockResponseTimeMetrics(): ResponseTimeMetrics {
    return {
      averageResponseTime: 18.5,
      slaCompliance: 87.3,
      responseTimeByStage: [
        { stage: 'Initial Review', averageHours: 4.2, slaTarget: 24 },
        { stage: 'Interview Response', averageHours: 12.5, slaTarget: 48 },
        { stage: 'Home Visit Scheduling', averageHours: 36.8, slaTarget: 72 },
        { stage: 'Final Decision', averageHours: 8.3, slaTarget: 24 },
      ],
      staffPerformance: [
        {
          staffId: '1',
          staffName: 'Sarah Johnson',
          averageResponseTime: 12.3,
          applicationsHandled: 45,
          slaCompliance: 95.6,
        },
        {
          staffId: '2',
          staffName: 'Mike Chen',
          averageResponseTime: 15.7,
          applicationsHandled: 38,
          slaCompliance: 89.5,
        },
        {
          staffId: '3',
          staffName: 'Emily Rodriguez',
          averageResponseTime: 18.2,
          applicationsHandled: 42,
          slaCompliance: 84.5,
        },
        {
          staffId: '4',
          staffName: 'James Wilson',
          averageResponseTime: 24.5,
          applicationsHandled: 31,
          slaCompliance: 77.4,
        },
      ],
    };
  }

  private getMockStageDistribution(): StageDistribution[] {
    return [
      { stage: 'Submitted', count: 45, percentage: 28.8, color: '#3B82F6' },
      { stage: 'Under Review', count: 32, percentage: 20.5, color: '#8B5CF6' },
      { stage: 'Interview Scheduled', count: 28, percentage: 17.9, color: '#10B981' },
      { stage: 'Home Visit', count: 22, percentage: 14.1, color: '#F59E0B' },
      { stage: 'Approved', count: 18, percentage: 11.5, color: '#06B6D4' },
      { stage: 'Adopted', count: 11, percentage: 7.1, color: '#EF4444' },
    ];
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
