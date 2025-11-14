import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Heading } from '@adopt-dont-shop/lib.components';
import {
  FiTrendingUp,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiBarChart2,
  FiPieChart,
} from 'react-icons/fi';

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

const PageContainer = styled.div`
  max-width: 100%;
  margin: 0;
  padding: 0;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;

    > * {
      width: 100%;
    }
  }
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.625rem 1rem;
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral[300]};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${props => props.theme.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary[400]};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[400]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const CardHeader = styled.div`
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.neutral[200]};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
  }

  svg {
    color: ${props => props.theme.colors.primary[600]};
    font-size: 1.25rem;
  }
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.text.secondary};

  svg {
    font-size: 3rem;
    color: ${props => props.theme.colors.neutral[300]};
    margin-bottom: 1rem;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.semantic.error[600]};
  background: ${props => props.theme.colors.semantic.error[50]};
  border: 1px solid ${props => props.theme.colors.semantic.error[200]};
  border-radius: 8px;

  p {
    margin: 0;
  }
`;

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
      alert('Failed to export CSV. Please try again.');
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
      alert('Failed to export PDF. Please try again.');
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

      alert('Report sent successfully!');
    } catch (err) {
      console.error('Email report failed:', err);
      alert('Failed to send report. Please try again.');
    }
  };

  if (error) {
    return (
      <PageContainer>
        <PageHeader>
          <Heading level="h1">Analytics & Reporting</Heading>
        </PageHeader>
        <ErrorState>
          <p>{error}</p>
        </ErrorState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <HeaderTop>
          <HeaderTitle>
            <h1>Analytics & Reporting</h1>
            <p>Comprehensive insights into your rescue's performance and operations</p>
          </HeaderTitle>

          <HeaderActions>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ExportButton
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              onEmailReport={handleEmailReport}
              disabled={loading}
            />
          </HeaderActions>
        </HeaderTop>

        <FilterBar>
          <FilterSelect value={petTypeFilter} onChange={e => setPetTypeFilter(e.target.value)}>
            <option value="all">All Pet Types</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="rabbit">Rabbits</option>
            <option value="other">Other</option>
          </FilterSelect>

          <FilterSelect value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
            <option value="all">All Staff Members</option>
            {responseTimeMetrics?.staffPerformance.map(staff => (
              <option key={staff.staffId} value={staff.staffId}>
                {staff.staffName}
              </option>
            ))}
          </FilterSelect>
        </FilterBar>
      </PageHeader>

      {/* Key Metrics */}
      <MetricsGrid>
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
      </MetricsGrid>

      {/* Adoption Trends */}
      <ChartsGrid>
        <Card>
          <CardHeader>
            <CardTitle>
              <FiBarChart2 />
              <h3>Adoption Trends</h3>
            </CardTitle>
          </CardHeader>
          <CardBody>
            {adoptionMetrics?.adoptionTrends ? (
              <AdoptionTrendsChart data={adoptionMetrics.adoptionTrends} loading={loading} />
            ) : (
              <EmptyState>
                <FiBarChart2 />
                <h3>No Data Available</h3>
                <p>Adoption trends will appear here once data is available.</p>
              </EmptyState>
            )}
          </CardBody>
        </Card>
      </ChartsGrid>

      {/* Two Column Layout */}
      <TwoColumnGrid>
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>
              <FiTrendingUp />
              <h3>Application Conversion Funnel</h3>
            </CardTitle>
          </CardHeader>
          <CardBody>
            {applicationAnalytics?.conversionRateByStage ? (
              <ConversionFunnelChart
                data={applicationAnalytics.conversionRateByStage}
                loading={loading}
              />
            ) : (
              <EmptyState>
                <FiTrendingUp />
                <h3>No Data Available</h3>
                <p>Conversion data will appear here once available.</p>
              </EmptyState>
            )}
          </CardBody>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>
              <FiPieChart />
              <h3>Stage Distribution</h3>
            </CardTitle>
          </CardHeader>
          <CardBody>
            {stageDistribution.length > 0 ? (
              <StageDistributionChart data={stageDistribution} loading={loading} />
            ) : (
              <EmptyState>
                <FiPieChart />
                <h3>No Data Available</h3>
                <p>Stage distribution will appear here once available.</p>
              </EmptyState>
            )}
          </CardBody>
        </Card>
      </TwoColumnGrid>

      {/* Response Time Metrics */}
      <ChartsGrid>
        <Card>
          <CardHeader>
            <CardTitle>
              <FiClock />
              <h3>Response Time by Stage</h3>
            </CardTitle>
          </CardHeader>
          <CardBody>
            {responseTimeMetrics?.responseTimeByStage ? (
              <ResponseTimeChart data={responseTimeMetrics.responseTimeByStage} loading={loading} />
            ) : (
              <EmptyState>
                <FiClock />
                <h3>No Data Available</h3>
                <p>Response time metrics will appear here once available.</p>
              </EmptyState>
            )}
          </CardBody>
        </Card>
      </ChartsGrid>

      {/* Pet Performance */}
      <ChartsGrid>
        <Card>
          <CardHeader>
            <CardTitle>
              <FiBarChart2 />
              <h3>Most Popular Breeds</h3>
            </CardTitle>
          </CardHeader>
          <CardBody>
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
              <EmptyState>
                <FiBarChart2 />
                <h3>No Data Available</h3>
                <p>Pet performance data will appear here once available.</p>
              </EmptyState>
            )}
          </CardBody>
        </Card>
      </ChartsGrid>
    </PageContainer>
  );
};

export default Analytics;
