import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  FormField,
  Input,
  MetricCard,
  Modal,
  PageHeader,
  SelectInput,
  toast,
  DateRangePicker,
  createDefaultDateRangePresets,
  EmptyState,
  type DateRangeValue,
} from '@adopt-dont-shop/lib.components';
import { ChartColumnIncreasing, ChartPie, CircleCheck, TrendingUp, Users } from 'lucide-react';
import * as styles from './Analytics.css';

// Analytics Components
import StageDistributionChart from '../components/analytics/StageDistributionChart';
import AdoptionTrendsChart from '../components/analytics/AdoptionTrendsChart';
import ConversionFunnelChart from '../components/analytics/ConversionFunnelChart';
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
import { analyticsService, DateRange, StageDistribution } from '../services/analyticsService';

const NO_STAGES: StageDistribution[] = [];

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

  // Each metric is its own query so that one failing endpoint doesn't blank
  // the whole dashboard: the affected section just falls through to its
  // existing "No Data Available" empty state.
  const rangeKey = { start: toIsoDate(dateRange.start), end: toIsoDate(dateRange.end) };
  const adoptionQuery = useQuery({
    queryKey: ['analytics', 'adoption-metrics', rangeKey],
    queryFn: () => analyticsService.getAdoptionMetrics(dateRange),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const applicationQuery = useQuery({
    queryKey: ['analytics', 'application-analytics', rangeKey],
    queryFn: () => analyticsService.getApplicationAnalytics(dateRange),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const petQuery = useQuery({
    queryKey: ['analytics', 'pet-performance', rangeKey],
    queryFn: () => analyticsService.getPetPerformance(dateRange),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const stageQuery = useQuery({
    queryKey: ['analytics', 'stage-distribution'],
    queryFn: () => analyticsService.getStageDistribution(),
    retry: false,
  });
  const adoptionMetrics = adoptionQuery.data ?? null;
  const applicationAnalytics = applicationQuery.data ?? null;
  const petPerformance = petQuery.data ?? null;
  const stageDistribution = stageQuery.data ?? NO_STAGES;
  const loading =
    adoptionQuery.isFetching ||
    applicationQuery.isFetching ||
    petQuery.isFetching ||
    stageQuery.isFetching;

  // Email report modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleDateRangeChange = (value: DateRangeValue) => {
    if (!value.from || !value.to) {
      return;
    }
    setDateRange({ start: new Date(value.from), end: new Date(value.to) });
  };

  // Export handlers
  const handleExportCSV = async () => {
    try {
      const blob = await analyticsService.exportToCSV('full-analytics', {
        dateRange,
        petType: petTypeFilter !== 'all' ? petTypeFilter : undefined,
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
      <PageHeader
        title="Analytics & Reporting"
        description="Comprehensive insights into your rescue's performance and operations"
        actions={
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
        }
      />

      <div className={styles.filterBar}>
        <SelectInput
          label="Pet type"
          value={petTypeFilter}
          onChange={value => setPetTypeFilter(String(value))}
          options={[
            { value: 'all', label: 'All Pet Types' },
            { value: 'dog', label: 'Dogs' },
            { value: 'cat', label: 'Cats' },
            { value: 'rabbit', label: 'Rabbits' },
            { value: 'other', label: 'Other' },
          ]}
        />
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
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Report"
        closeOnEscape={!sendingEmail}
        closeOnOverlayClick={!sendingEmail}
      >
        <form onSubmit={handleEmailModalSubmit} className={styles.emailModalForm}>
          <FormField
            label="Email Address"
            htmlFor="report-email"
            required
            error={emailError || undefined}
          >
            <Input
              id="report-email"
              type="email"
              autoFocus
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
          </FormField>
          <div className={styles.emailModalActions}>
            <Button
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sendingEmail}>
              {sendingEmail ? 'Sending...' : 'Send Report'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Analytics;
