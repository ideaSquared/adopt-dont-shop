import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  MetricCard,
  toast,
  DateRangePicker,
  createDefaultDateRangePresets,
  EmptyState,
  type DateRangeValue,
} from '@adopt-dont-shop/lib.components';
import {
  ChartColumnIncreasing,
  ChartPie,
  CircleCheck,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react';
import * as styles from './Analytics.css';

// Analytics Components
import StageDistributionChart from '../components/analytics/StageDistributionChart';
import AdoptionTrendsChart from '../components/analytics/AdoptionTrendsChart';
import ConversionFunnelChart from '../components/analytics/ConversionFunnelChart';
import ResponseTimeChart from '../components/analytics/ResponseTimeChart';
import ExportButton from '../components/analytics/ExportButton';

// The shared DateRangePicker works in ISO `yyyy-mm-dd` strings, while the
// analytics service reasons in `Date`s. Convert at the picker boundary only.
const toIsoDate = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  // Build the ISO date from local calendar parts rather than `toISOString()`,
  // so the visible/queried day never slips to UTC's around midnight (BST).
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Quick-select shortcuts restored from the previous local picker: Last 7/30/90
// days, This month, Last month. `getRange` resolves against the current date on
// each click.
const dateRangePresets = createDefaultDateRangePresets();

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

  // Loading state
  const [loading, setLoading] = useState(true);

  // Email report modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleDateRangeChange = (value: DateRangeValue) => {
    if (!value.from || !value.to) {
      return;
    }
    setDateRange({ start: new Date(value.from), end: new Date(value.to) });
  };

  // Fetch analytics data. Each metric is fetched and applied independently
  // so that one failing endpoint (e.g. response-time, which has no backend
  // yet) doesn't blank the whole dashboard — the affected section just
  // falls through to its existing "No Data Available" empty state.
  useEffect(() => {
    let cancelled = false;

    const fetchAnalytics = async () => {
      setLoading(true);

      const [adoption, application, pet, responseTime, stages] = await Promise.allSettled([
        analyticsService.getAdoptionMetrics(dateRange),
        analyticsService.getApplicationAnalytics(dateRange),
        analyticsService.getPetPerformance(dateRange),
        analyticsService.getResponseTimeMetrics(dateRange),
        analyticsService.getStageDistribution(),
      ]);

      if (cancelled) {
        return;
      }

      if (adoption.status === 'fulfilled') {
        setAdoptionMetrics(adoption.value);
      } else {
        console.error('Failed to fetch adoption metrics:', adoption.reason);
      }

      if (application.status === 'fulfilled') {
        setApplicationAnalytics(application.value);
      } else {
        console.error('Failed to fetch application analytics:', application.reason);
      }

      if (pet.status === 'fulfilled') {
        setPetPerformance(pet.value);
      } else {
        console.error('Failed to fetch pet performance:', pet.reason);
      }

      if (responseTime.status === 'fulfilled') {
        setResponseTimeMetrics(responseTime.value);
      } else {
        console.error('Failed to fetch response time metrics:', responseTime.reason);
      }

      if (stages.status === 'fulfilled') {
        setStageDistribution(stages.value);
      } else {
        console.error('Failed to fetch stage distribution:', stages.reason);
      }

      setLoading(false);
    };

    fetchAnalytics();
    return () => {
      cancelled = true;
    };
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
    setEmailAddress('');
    setEmailError('');
    setShowEmailModal(true);
  };

  const handleEmailModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailAddress.trim();
    if (!trimmed) {
      setEmailError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    try {
      setSendingEmail(true);
      await analyticsService.emailReport(
        'full-analytics',
        {
          dateRange,
          petType: petTypeFilter !== 'all' ? petTypeFilter : undefined,
          staffMemberId: staffFilter !== 'all' ? staffFilter : undefined,
        },
        [trimmed]
      );
      setShowEmailModal(false);
      toast.success('Report sent successfully!');
    } catch (err) {
      console.error('Email report failed:', err);
      toast.error('Failed to send report. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h1>Analytics & Reporting</h1>
            <p>Comprehensive insights into your rescue's performance and operations</p>
          </div>

          <div className={styles.headerActions}>
            <DateRangePicker
              value={{ from: toIsoDate(dateRange.start), to: toIsoDate(dateRange.end) }}
              onChange={handleDateRangeChange}
              presets={dateRangePresets}
            />
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
          label="Total Adoptions"
          value={adoptionMetrics?.totalAdoptions || 0}
          icon={<CircleCheck size="1em" />}
          delta={
            adoptionMetrics?.comparisonPeriod
              ? adoptionMetrics.comparisonPeriod.percentageChange / 100
              : undefined
          }
          helperText={adoptionMetrics?.comparisonPeriod ? 'from previous period' : undefined}
          loading={loading}
        />

        <MetricCard
          label="Success Rate"
          value={`${adoptionMetrics?.successRate.toFixed(1) || 0}%`}
          icon={<TrendingUp size="1em" />}
          delta={
            adoptionMetrics?.comparisonPeriod
              ? (adoptionMetrics.successRate - adoptionMetrics.comparisonPeriod.successRate) / 100
              : undefined
          }
          helperText={adoptionMetrics?.comparisonPeriod ? 'from previous period' : undefined}
          loading={loading}
        />

        <MetricCard
          label="Avg. Response Time"
          value={`${responseTimeMetrics?.averageResponseTime.toFixed(1) || 0}h`}
          icon={<Clock size="1em" />}
          helperText={`SLA Compliance: ${responseTimeMetrics?.slaCompliance.toFixed(1) || 0}%`}
          loading={loading}
        />

        <MetricCard
          label="Total Applications"
          value={applicationAnalytics?.totalApplications || 0}
          icon={<Users size="1em" />}
          helperText="In current period"
          loading={loading}
        />
      </div>

      {/* Adoption Trends */}
      <div className={styles.chartsGrid}>
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <ChartColumnIncreasing size="1em" />
              <h3>Adoption Trends</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {adoptionMetrics?.adoptionTrends ? (
              <AdoptionTrendsChart data={adoptionMetrics.adoptionTrends} loading={loading} />
            ) : (
              <EmptyState
                title="No data available"
                description="Adoption trends will appear here once data is available."
                icon={<ChartColumnIncreasing size="1em" />}
              />
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
              <TrendingUp size="1em" />
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
              <EmptyState
                title="No data available"
                description="Conversion data will appear here once available."
                icon={<TrendingUp size="1em" />}
              />
            )}
          </div>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <ChartPie size="1em" />
              <h3>Stage Distribution</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {stageDistribution.length > 0 ? (
              <StageDistributionChart data={stageDistribution} loading={loading} />
            ) : (
              <EmptyState
                title="No data available"
                description="Stage distribution will appear here once available."
                icon={<ChartPie size="1em" />}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Response Time Metrics */}
      <div className={styles.chartsGrid}>
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Clock size="1em" />
              <h3>Response Time by Stage</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {responseTimeMetrics?.responseTimeByStage ? (
              <ResponseTimeChart data={responseTimeMetrics.responseTimeByStage} loading={loading} />
            ) : (
              <EmptyState
                title="No data available"
                description="Response time metrics will appear here once available."
                icon={<Clock size="1em" />}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Pet Performance */}
      <div className={styles.chartsGrid}>
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <ChartColumnIncreasing size="1em" />
              <h3>Most Popular Breeds</h3>
            </div>
          </div>
          <div className={styles.cardBody}>
            {petPerformance?.mostPopularBreeds && petPerformance.mostPopularBreeds.length > 0 ? (
              <div className={styles.breedList}>
                {petPerformance.mostPopularBreeds.map((breed, index) => (
                  <div key={breed.breed} className={styles.breedRow}>
                    <div>
                      <div className={styles.breedTitle}>
                        #{index + 1} {breed.breed}
                      </div>
                      <div className={styles.breedSubtitle}>
                        Avg. {breed.averageAdoptionTime.toFixed(1)} days to adoption
                      </div>
                    </div>
                    <div className={styles.breedCount}>{breed.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No data available"
                description="Pet performance data will appear here once available."
                icon={<ChartColumnIncreasing size="1em" />}
              />
            )}
          </div>
        </Card>
      </div>
      {/* Email Report Modal */}
      {showEmailModal && (
        <div
          className={styles.emailModalOverlay}
          onClick={e => e.target === e.currentTarget && setShowEmailModal(false)}
          onKeyDown={e => e.key === 'Escape' && setShowEmailModal(false)}
          role="presentation"
        >
          <div className={styles.emailModalContent}>
            <div className={styles.emailModalHeader}>
              <h2 className={styles.emailModalTitle}>Email Report</h2>
              <button
                type="button"
                className={styles.emailModalCloseButton}
                onClick={() => setShowEmailModal(false)}
                disabled={sendingEmail}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEmailModalSubmit} className={styles.emailModalForm}>
              <div className={styles.emailModalFormGroup}>
                <label className={styles.emailModalLabel} htmlFor="report-email">
                  Email Address <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  ref={emailInputRef}
                  id="report-email"
                  type="email"
                  autoFocus
                  className={styles.emailModalInput}
                  value={emailAddress}
                  onChange={e => {
                    setEmailAddress(e.target.value);
                    if (emailError) {
                      setEmailError('');
                    }
                  }}
                  placeholder="recipient@example.com"
                  disabled={sendingEmail}
                  required
                />
                {emailError && <span className={styles.emailModalError}>{emailError}</span>}
              </div>
              <div className={styles.emailModalActions}>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  className={styles.emailModalCancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className={styles.emailModalSubmitButton}
                >
                  {sendingEmail ? 'Sending...' : 'Send Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
