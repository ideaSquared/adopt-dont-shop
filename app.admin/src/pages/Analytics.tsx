import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Heading, Text, Button } from '@adopt-dont-shop/lib.components';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDownload,
  FiUsers,
  FiHeart,
  FiMessageSquare,
  FiCheckCircle,
} from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatsBar,
  StatCard,
  StatIcon,
  StatDetails,
  StatLabel,
  StatValue,
  FilterBar,
  FilterGroup,
  Select,
} from '../components/ui';
import { usePlatformMetrics, useDashboardAnalytics } from '../hooks';

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
`;

const ChartCard = styled(Card)`
  min-height: 350px;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 280px;
  margin-top: 1rem;
  position: relative;
`;

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 0.75rem;
  padding: 1rem 0;
`;

const Bar = styled.div<{ $height: number; $color: string }>`
  flex: 1;
  height: ${props => props.$height}%;
  background: ${props => props.$color};
  border-radius: 6px 6px 0 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
    transform: translateY(-4px);
  }
`;

const BarLabel = styled.div`
  position: absolute;
  bottom: -30px;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
`;

const BarValue = styled.div`
  position: absolute;
  top: -30px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
`;

const LineChart = styled.div`
  height: 100%;
  padding: 1rem 0;
  position: relative;
`;

const LineChartGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const GridLine = styled.div`
  width: 100%;
  height: 1px;
  background: #e5e7eb;
  position: relative;

  span {
    position: absolute;
    left: -40px;
    top: -8px;
    font-size: 0.75rem;
    color: #9ca3af;
  }
`;

const LineChartSVG = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 30px;
  width: 100%;
  height: calc(100% - 30px);
`;

const LineChartLabels = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;

  span {
    font-size: 0.75rem;
    color: #6b7280;
  }
`;

const PieChartContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 2rem;
`;

const PieChart = styled.svg`
  width: 200px;
  height: 200px;
`;

const PieLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: ${props => props.$color};
`;

const LegendLabel = styled.div`
  font-size: 0.875rem;
  color: #374151;
  flex: 1;
`;

const LegendValue = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
`;

const MetricChange = styled.div<{ $positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: ${props => (props.$positive ? '#059669' : '#dc2626')};
  font-weight: 600;

  svg {
    font-size: 1rem;
  }
`;

const TopItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const TopItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`;

const TopItemRank = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
`;

const TopItemInfo = styled.div`
  flex: 1;
  margin-left: 1rem;
`;

const TopItemName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
`;

const TopItemMeta = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
`;

const TopItemValue = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string }>`
  width: ${props => props.$width ?? '100%'};
  height: ${props => props.$height ?? '1rem'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

const ErrorBanner = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  color: #991b1b;
  font-size: 0.875rem;
`;

const PIE_COLORS = ['#667eea', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6'];

const timeRangeToDates = (range: string): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = new Date();
  switch (range) {
    case '7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '90days':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '12months':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }
  return { startDate, endDate };
};

const polarToCartesian = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describePieArc = (x: number, y: number, r: number, start: number, end: number) => {
  const s = polarToCartesian(x, y, r, end);
  const e = polarToCartesian(x, y, r, start);
  const large = end - start <= 180 ? '0' : '1';
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${x} ${y} Z`;
};

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30days');

  const dateRange = useMemo(() => timeRangeToDates(timeRange), [timeRange]);

  const { data: metricsData, isLoading: metricsLoading } = usePlatformMetrics();
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useDashboardAnalytics(dateRange);

  const isLoading = metricsLoading || analyticsLoading;

  const adoptionTrends = analyticsData?.adoptions.adoptionTrends ?? [];
  const topRescues = analyticsData?.adoptions.rescuePerformance.slice(0, 5) ?? [];
  const popularPetTypes = analyticsData?.adoptions.popularPetTypes ?? [];

  const maxAdoptionValue = adoptionTrends.length
    ? Math.max(...adoptionTrends.map(d => d.value), 1)
    : 1;

  const totalListings = metricsData?.pets.available ?? 0;
  const totalAdopters = metricsData?.users.total ?? 0;
  const activeRescues = metricsData?.rescues.verified ?? 0;
  const weeklyAdoptions = analyticsData?.adoptions.totalAdoptions ?? 0;

  const petPieSlices = useMemo(() => {
    const total = popularPetTypes.reduce((s, p) => s + p.count, 0) || 1;
    let angle = 0;
    return popularPetTypes.map((p, i) => {
      const pct = p.count / total;
      const slice = {
        type: p.type,
        count: p.count,
        color: PIE_COLORS[i % PIE_COLORS.length],
        percentage: (pct * 100).toFixed(1),
        startAngle: angle,
        endAngle: angle + pct * 360,
      };
      angle += pct * 360;
      return slice;
    });
  }, [popularPetTypes]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Platform Analytics</Heading>
          <Text>Comprehensive analytics and data insights</Text>
        </HeaderLeft>
        <HeaderActions>
          <FilterBar style={{ padding: '0.5rem 0.75rem', marginBottom: 0 }}>
            <FilterGroup style={{ minWidth: '140px', marginBottom: 0 }}>
              <Select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
                <option value='7days'>Last 7 Days</option>
                <option value='30days'>Last 30 Days</option>
                <option value='90days'>Last 90 Days</option>
                <option value='12months'>Last 12 Months</option>
              </Select>
            </FilterGroup>
          </FilterBar>
          <Button variant='outline' size='md'>
            <FiDownload style={{ marginRight: '0.5rem' }} />
            Export Report
          </Button>
        </HeaderActions>
      </PageHeader>

      {analyticsError && (
        <ErrorBanner role='alert'>Failed to load analytics data. Please try again.</ErrorBanner>
      )}

      <StatsBar>
        <StatCard>
          <StatIcon $color='#667eea'>
            <FiUsers />
          </StatIcon>
          <StatDetails>
            <StatLabel>Total Users</StatLabel>
            {isLoading ? (
              <SkeletonBlock $width='80px' $height='1.5rem' />
            ) : (
              <StatValue>{totalAdopters.toLocaleString()}</StatValue>
            )}
            <MetricChange $positive={true}>
              <FiTrendingUp />
              {metricsData ? `${metricsData.users.newThisMonth.toLocaleString()} new this month` : '—'}
            </MetricChange>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#10b981'>
            <FiHeart />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Rescues</StatLabel>
            {isLoading ? (
              <SkeletonBlock $width='60px' $height='1.5rem' />
            ) : (
              <StatValue>{activeRescues.toLocaleString()}</StatValue>
            )}
            <MetricChange $positive={true}>
              <FiTrendingUp />
              {metricsData ? `${metricsData.rescues.total} total` : '—'}
            </MetricChange>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#f59e0b'>
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Weekly Adoptions</StatLabel>
            {isLoading ? (
              <SkeletonBlock $width='60px' $height='1.5rem' />
            ) : (
              <StatValue>{weeklyAdoptions.toLocaleString()}</StatValue>
            )}
            <MetricChange $positive={weeklyAdoptions > 0}>
              {weeklyAdoptions > 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              {analyticsData
                ? `${(analyticsData.adoptions.adoptionRate ?? 0).toFixed(1)}% adoption rate`
                : '—'}
            </MetricChange>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#ec4899'>
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Listings</StatLabel>
            {isLoading ? (
              <SkeletonBlock $width='80px' $height='1.5rem' />
            ) : (
              <StatValue>{totalListings.toLocaleString()}</StatValue>
            )}
            <MetricChange $positive={true}>
              <FiTrendingUp />
              {metricsData ? `${metricsData.pets.total} total pets` : '—'}
            </MetricChange>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <AnalyticsGrid>
        <ChartCard>
          <CardHeader>
            <CardTitle>Adoption Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              {isLoading ? (
                <SkeletonBlock $height='100%' />
              ) : adoptionTrends.length > 0 ? (
                <BarChart>
                  {adoptionTrends.map(d => (
                    <Bar
                      key={d.date}
                      $height={Math.max((d.value / maxAdoptionValue) * 100, 2)}
                      $color='#10b981'
                    >
                      <BarValue>{d.value}</BarValue>
                      <BarLabel>{formatDate(d.date)}</BarLabel>
                    </Bar>
                  ))}
                </BarChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '0.875rem' }}>
                  No adoption data for this period
                </div>
              )}
            </ChartContainer>
          </CardContent>
        </ChartCard>

        <ChartCard>
          <CardHeader>
            <CardTitle>Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              {isLoading ? (
                <SkeletonBlock $height='100%' />
              ) : analyticsData ? (
                (() => {
                  const statusData = Object.entries(analyticsData.applications.statusMetrics).map(([status, count], i) => ({
                    status,
                    count: count as number,
                    color: ['#10b981', '#f59e0b', '#ef4444', '#667eea', '#8b5cf6'][i % 5],
                  }));
                  const maxCount = Math.max(...statusData.map(s => s.count), 1);
                  return (
                    <BarChart>
                      {statusData.map(s => (
                        <Bar key={s.status} $height={Math.max((s.count / maxCount) * 100, 2)} $color={s.color}>
                          <BarValue>{s.count}</BarValue>
                          <BarLabel style={{ textTransform: 'capitalize' }}>{s.status}</BarLabel>
                        </Bar>
                      ))}
                    </BarChart>
                  );
                })()
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '0.875rem' }}>
                  No application data available
                </div>
              )}
            </ChartContainer>
          </CardContent>
        </ChartCard>

        <ChartCard>
          <CardHeader>
            <CardTitle>Pet Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartContainer>
              {isLoading ? (
                <SkeletonBlock $width='200px' $height='200px' style={{ borderRadius: '50%' }} />
              ) : petPieSlices.length > 0 ? (
                <>
                  <PieChart viewBox='0 0 200 200'>
                    {petPieSlices.map((slice, i) => (
                      <path
                        key={i}
                        d={describePieArc(100, 100, 80, slice.startAngle, slice.endAngle)}
                        fill={slice.color}
                        stroke='#ffffff'
                        strokeWidth='2'
                      />
                    ))}
                  </PieChart>
                  <PieLegend>
                    {petPieSlices.map(slice => (
                      <LegendItem key={slice.type}>
                        <LegendColor $color={slice.color} />
                        <LegendLabel>{slice.type}</LegendLabel>
                        <LegendValue>{slice.percentage}%</LegendValue>
                      </LegendItem>
                    ))}
                  </PieLegend>
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                  No pet type data for this period
                </div>
              )}
            </PieChartContainer>
          </CardContent>
        </ChartCard>

        <ChartCard>
          <CardHeader>
            <CardTitle>Top Performing Rescues</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TopItemsList>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock key={i} $height='3rem' />
                ))}
              </TopItemsList>
            ) : topRescues.length > 0 ? (
              <TopItemsList>
                {topRescues.map((rescue, index) => (
                  <TopItem key={rescue.rescueId}>
                    <TopItemRank>{index + 1}</TopItemRank>
                    <TopItemInfo>
                      <TopItemName>{rescue.rescueName}</TopItemName>
                      <TopItemMeta>
                        {rescue.averageTimeToAdoption > 0
                          ? `avg ${rescue.averageTimeToAdoption.toFixed(1)} days to adopt`
                          : 'adoption data pending'}
                      </TopItemMeta>
                    </TopItemInfo>
                    <TopItemValue>{rescue.adoptions}</TopItemValue>
                  </TopItem>
                ))}
              </TopItemsList>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '1rem 0' }}>
                No rescue performance data for this period
              </div>
            )}
          </CardContent>
        </ChartCard>
      </AnalyticsGrid>
    </PageContainer>
  );
};

export default Analytics;
