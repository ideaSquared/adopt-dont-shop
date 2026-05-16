import React, { useState, useEffect } from 'react';
import { Card, Heading, toast } from '@adopt-dont-shop/lib.components';
import {
  FiTrendingUp,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiBarChart2,
  FiPieChart,
} from 'react-icons/fi';
import * as styles from './Analytics.css';

// Analytics Components
import MetricCard from '../components/analytics/MetricCard';
import StageDistributionChart from '../components/analytics/StageDistributionChart';
import AdoptionTrendsChart from '../components/analytics/AdoptionTrendsChart';
import ConversionFunnelChart from '../components/analytics/ConversionFunnelChart';
import ResponseTimeChart from '../components/analytics/ResponseTimeChart';
import DateRangePicker from '../components/analytics/DateRangePicker';
import ExportButton from '../components/analytics/ExportButton';

// Services
import {
  analyticsService,
  DateRange,
  AdoptionMetrics,
  ApplicationAnalytics,
  PetPerformance,
  ResponseTimeMetrics,
  StageDistribution,
} from '../services/analyticsService';

const Analytics: React.FC = () => {
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  // Filter state
  const [petTypeFilter, setPetTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');

  // Data state
  const [adoptionMetrics, setAdoptionMetrics] = useState<AdoptionMetrics | null>(null);
  const [applicationAnalytics, setApplicationAnalytics] = useState<ApplicationAnalytics | null>(
    null
  );
  const [petPerformance, setPetPerformance] = useState<PetPerformance | null>(null);
  const [responseTimeMetrics, setResponseTimeMetrics] = useState<ResponseTimeMetrics | null>(null);
  const [stageDistribution, setStageDistribution] = useState<StageDistribution[]>([]);

  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const [adoption, application, pet, responseTime, stages] = await Promise.all([
          analyticsService.getAdoptionMetrics(dateRange),
          analyticsService.getApplicationAnalytics(dateRange),
          analyticsService.getPetPerformance(dateRange),
          analyticsService.getResponseTimeMetrics(dateRange),
          analyticsService.getStageDistribution(),
        ]);

        setAdoptionMetrics(adoption);
        setApplicationAnalytics(application);
        setPetPerformance(pet);
        setResponseTimeMetrics(responseTime);
        setStageDistribution(stages);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  // Export handlers
  const handleExportCSV = async () => {
    try {
      const blob = await analyticsService.exportToCSV('full-analytics', {
        dateRange,
        petType: petTypeFilter !== 'all' ? petTypeFilter : undefined,
        staffMemberId: staffFilter !== 'all' ? staffFilter : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export CSV failed:', err);
      toast.error('Failed to export CSV. Please try again.', {
        action: { label: 'Retry', onClick: handleExportCSV },
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await analyticsService.exportToPDF('full-analytics', {
        dateRange,
        petType: petTypeFilter !== 'all' ? petTypeFilter : undefined,
        staffMemberId: staffFilter !== 'all' ? staffFilter : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export PDF failed:', err);
      toast.error('Failed to export PDF. Please try again.', {
        action: { label: 'Retry', onClick: handleExportPDF },
      });
    }
  };

  const handleEmailReport = async () => {
    try {
      const email = prompt('Enter email address to send report:');
      if (!email) {
        return;
      }

      await analyticsService.emailReport(
        'full-analytics',
        {
          dateRange,
          petType: petTypeFilter !== 'all' ? petTypeFilter : undefined,
          staffMemberId: staffFilter !== 'all' ? staffFilter : undefined,
        },
        [email]
      );

      toast.success('Report sent successfully!');
    } catch (err) {
      console.error('Email report failed:', err);
      toast.error('Failed to send report. Please try again.', {
        action: { label: 'Retry', onClick: handleEmailReport },
      });
    }
  };

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <Heading level="h1">Analytics & Reporting</Heading>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h1>Analytics & Reporting</h1>
            <p>Comprehensive insights into your rescue's performance and operations</p>
          </div>

          <div className={styles.headerActions}>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ExportButton
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              onEmailReport={handleEmailReport}
              disabled={loading}
            />
          </div>
        </div>

        <div className={styles.filterBar}>
          <select
            className={styles.filterSelect}
            value={petTypeFilter}
            onChange={e => setPetTypeFilter(e.target.value)}
          >
            <option value="all">All Pet Types</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="rabbit">Rabbits</option>
            <option value="other">Other</option>
          </select>

          <select
            className={styles.filterSelect}
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
          >
            <option value="all">All Staff Members</option>
            {responseTimeMetrics?.staffPerformance.map(staff => (
              <option key={staff.staffId} value={staff.staffId}>
                {staff.staffName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard
          title="Total Adoptions"
          value={adoptionMetrics?.totalAdoptions || 0}
          icon={<FiCheckCircle />}
          trend={
            adoptionMetrics?.comparisonPeriod
              ? {
                  value: adoptionMetrics.comparisonPeriod.percentageChange,
                  isPositive: adoptionMetrics.comparisonPeriod.percentageChange > 0,
                  label: 'from previous period',
                }
              : undefined
          }
          loading={loading}
        />

        <MetricCard
          title="Success Rate"
          value={`${adoptionMetrics?.successRate.toFixed(1) || 0}%`}
          icon={<FiTrendingUp />}
          trend={
            adoptionMetrics?.comparisonPeriod
              ? {
                  value: Math.abs(
                    adoptionMetrics.successRate - adoptionMetrics.comparisonPeriod.successRate
                  ),
                  isPositive:
                    adoptionMetrics.successRate > adoptionMetrics.comparisonPeriod.successRate,
                  label: 'from previous period',
                }
              : undefined
          }
          loading={loading}
        />

        <MetricCard
          title="Avg. Response Time"
          value={`${responseTimeMetrics?.averageResponseTime.toFixed(1) || 0}h`}
          icon={<FiClock />}
          subtitle={`SLA Compliance: ${responseTimeMetrics?.slaCompliance.toFixed(1) || 0}%`}
          loading={loading}
        />

        <MetricCard
          title="Total Applications"
          value={applicationAnalytics?.totalApplications || 0}
          icon={<FiUsers />}
          subtitle="In current period"
          loading={loading}
        />
      </div>

      {/* Adoption Trends */}
      <div className={styles.chartsGrid}>
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <FiBarChart2 />
              <h3>Adoption Trends</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {adoptionMetrics?.adoptionTrends ? (
              <AdoptionTrendsChart data={adoptionMetrics.adoptionTrends} loading={loading} />
            ) : (
              <div className={styles.emptyState}>
                <FiBarChart2 />
                <h3>No Data Available</h3>
                <p>Adoption trends will appear here once data is available.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className={styles.twoColumnGrid}>
        {/* Conversion Funnel */}
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <FiTrendingUp />
              <h3>Application Conversion Funnel</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {applicationAnalytics?.conversionRateByStage ? (
              <ConversionFunnelChart
                data={applicationAnalytics.conversionRateByStage}
                loading={loading}
              />
            ) : (
              <div className={styles.emptyState}>
                <FiTrendingUp />
                <h3>No Data Available</h3>
                <p>Conversion data will appear here once available.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <FiPieChart />
              <h3>Stage Distribution</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {stageDistribution.length > 0 ? (
              <StageDistributionChart data={stageDistribution} loading={loading} />
            ) : (
              <div className={styles.emptyState}>
                <FiPieChart />
                <h3>No Data Available</h3>
                <p>Stage distribution will appear here once available.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Response Time Metrics */}
      <div className={styles.chartsGrid}>
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <FiClock />
              <h3>Response Time by Stage</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {responseTimeMetrics?.responseTimeByStage ? (
              <ResponseTimeChart data={responseTimeMetrics.responseTimeByStage} loading={loading} />
            ) : (
              <div className={styles.emptyState}>
                <FiClock />
                <h3>No Data Available</h3>
                <p>Response time metrics will appear here once available.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Pet Performance */}
      <div className={styles.chartsGrid}>
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <FiBarChart2 />
              <h3>Most Popular Breeds</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {petPerformance?.mostPopularBreeds && petPerformance.mostPopularBreeds.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {petPerformance.mostPopularBreeds.map((breed, index) => (
                  <div
                    key={breed.breed}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        #{index + 1} {breed.breed}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                        Avg. {breed.averageAdoptionTime.toFixed(1)} days to adoption
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#3B82F6',
                      }}
                    >
                      {breed.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FiBarChart2 />
                <h3>No Data Available</h3>
                <p>Pet performance data will appear here once available.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
