import React, { useState, useMemo } from 'react';
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
import * as styles from './Analytics.css';

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
        <div className={styles.headerActions}>
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
        </div>
      </PageHeader>

      {analyticsError && (
        <div className={styles.errorBanner} role='alert'>
          Failed to load analytics data. Please try again.
        </div>
      )}

      <StatsBar>
        <StatCard>
          <StatIcon $color='#667eea'>
            <FiUsers />
          </StatIcon>
          <StatDetails>
            <StatLabel>Total Users</StatLabel>
            {isLoading ? (
              <div className={styles.skeletonBlock} style={{ width: '80px', height: '1.5rem' }} />
            ) : (
              <StatValue>{totalAdopters.toLocaleString()}</StatValue>
            )}
            <div className={styles.metricChangePositive}>
              <FiTrendingUp />
              {metricsData
                ? `${metricsData.users.newThisMonth.toLocaleString()} new this month`
                : '—'}
            </div>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#10b981'>
            <FiHeart />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Rescues</StatLabel>
            {isLoading ? (
              <div className={styles.skeletonBlock} style={{ width: '60px', height: '1.5rem' }} />
            ) : (
              <StatValue>{activeRescues.toLocaleString()}</StatValue>
            )}
            <div className={styles.metricChangePositive}>
              <FiTrendingUp />
              {metricsData ? `${metricsData.rescues.total} total` : '—'}
            </div>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#f59e0b'>
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Weekly Adoptions</StatLabel>
            {isLoading ? (
              <div className={styles.skeletonBlock} style={{ width: '60px', height: '1.5rem' }} />
            ) : (
              <StatValue>{weeklyAdoptions.toLocaleString()}</StatValue>
            )}
            <div
              className={
                weeklyAdoptions > 0 ? styles.metricChangePositive : styles.metricChangeNegative
              }
            >
              {weeklyAdoptions > 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              {analyticsData
                ? `${(analyticsData.adoptions.adoptionRate ?? 0).toFixed(1)}% adoption rate`
                : '—'}
            </div>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#ec4899'>
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Listings</StatLabel>
            {isLoading ? (
              <div className={styles.skeletonBlock} style={{ width: '80px', height: '1.5rem' }} />
            ) : (
              <StatValue>{totalListings.toLocaleString()}</StatValue>
            )}
            <div className={styles.metricChangePositive}>
              <FiTrendingUp />
              {metricsData ? `${metricsData.pets.total} total pets` : '—'}
            </div>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <div className={styles.analyticsGrid}>
        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Adoption Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.chartContainer}>
              {isLoading ? (
                <div className={styles.skeletonBlock} style={{ height: '100%' }} />
              ) : adoptionTrends.length > 0 ? (
                <div className={styles.barChart}>
                  {adoptionTrends.map(d => (
                    <div
                      key={d.date}
                      className={styles.bar}
                      style={{
                        height: `${Math.max((d.value / maxAdoptionValue) * 100, 2)}%`,
                        background: '#10b981',
                      }}
                    >
                      <div className={styles.barValue}>{d.value}</div>
                      <div className={styles.barLabel}>{formatDate(d.date)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                  }}
                >
                  No adoption data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.chartContainer}>
              {isLoading ? (
                <div className={styles.skeletonBlock} style={{ height: '100%' }} />
              ) : analyticsData ? (
                (() => {
                  const statusData = Object.entries(analyticsData.applications.statusMetrics).map(
                    ([status, count], i) => ({
                      status,
                      count: count as number,
                      color: ['#10b981', '#f59e0b', '#ef4444', '#667eea', '#8b5cf6'][i % 5],
                    })
                  );
                  const maxCount = Math.max(...statusData.map(s => s.count), 1);
                  return (
                    <div className={styles.barChart}>
                      {statusData.map(s => (
                        <div
                          key={s.status}
                          className={styles.bar}
                          style={{
                            height: `${Math.max((s.count / maxCount) * 100, 2)}%`,
                            background: s.color,
                          }}
                        >
                          <div className={styles.barValue}>{s.count}</div>
                          <div className={styles.barLabel} style={{ textTransform: 'capitalize' }}>
                            {s.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                  }}
                >
                  No application data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Pet Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.pieChartContainer}>
              {isLoading ? (
                <div
                  className={styles.skeletonBlock}
                  style={{ width: '200px', height: '200px', borderRadius: '50%' }}
                />
              ) : petPieSlices.length > 0 ? (
                <>
                  <svg className={styles.pieChart} viewBox='0 0 200 200'>
                    {petPieSlices.map((slice, i) => (
                      <path
                        key={i}
                        d={describePieArc(100, 100, 80, slice.startAngle, slice.endAngle)}
                        fill={slice.color}
                        stroke='#ffffff'
                        strokeWidth='2'
                      />
                    ))}
                  </svg>
                  <div className={styles.pieLegend}>
                    {petPieSlices.map(slice => (
                      <div key={slice.type} className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ background: slice.color }} />
                        <div className={styles.legendLabel}>{slice.type}</div>
                        <div className={styles.legendValue}>{slice.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                  No pet type data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Top Performing Rescues</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className={styles.topItemsList}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.skeletonBlock} style={{ height: '3rem' }} />
                ))}
              </div>
            ) : topRescues.length > 0 ? (
              <div className={styles.topItemsList}>
                {topRescues.map((rescue, index) => (
                  <div key={rescue.rescueId} className={styles.topItem}>
                    <div className={styles.topItemRank}>{index + 1}</div>
                    <div className={styles.topItemInfo}>
                      <div className={styles.topItemName}>{rescue.rescueName}</div>
                      <div className={styles.topItemMeta}>
                        {rescue.averageTimeToAdoption > 0
                          ? `avg ${rescue.averageTimeToAdoption.toFixed(1)} days to adopt`
                          : 'adoption data pending'}
                      </div>
                    </div>
                    <div className={styles.topItemValue}>{rescue.adoptions}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '1rem 0' }}>
                No rescue performance data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Analytics;
