import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button } from '@adopt-dont-shop/components';
import { FiTrendingUp, FiTrendingDown, FiDownload, FiCalendar, FiUsers, FiHeart, FiMessageSquare, FiCheckCircle } from 'react-icons/fi';
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
  FilterLabel,
  Select
} from '../components/ui';

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
  color: ${props => props.$positive ? '#059669' : '#dc2626'};
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

// Mock data for charts
const userGrowthData = [
  { month: 'Jan', adopters: 450, rescues: 35 },
  { month: 'Feb', adopters: 520, rescues: 42 },
  { month: 'Mar', adopters: 680, rescues: 51 },
  { month: 'Apr', adopters: 790, rescues: 58 },
  { month: 'May', adopters: 920, rescues: 67 },
  { month: 'Jun', adopters: 1050, rescues: 74 }
];

const adoptionData = [
  { day: 'Mon', adoptions: 12 },
  { day: 'Tue', adoptions: 18 },
  { day: 'Wed', adoptions: 15 },
  { day: 'Thu', adoptions: 22 },
  { day: 'Fri', adoptions: 28 },
  { day: 'Sat', adoptions: 35 },
  { day: 'Sun', adoptions: 30 }
];

const petTypeDistribution = [
  { type: 'Dogs', count: 1245, color: '#667eea' },
  { type: 'Cats', count: 980, color: '#f59e0b' },
  { type: 'Rabbits', count: 234, color: '#ec4899' },
  { type: 'Birds', count: 156, color: '#14b8a6' },
  { type: 'Other', count: 89, color: '#8b5cf6' }
];

const topRescues = [
  { name: 'Paws & Claws Rescue', location: 'London', adoptions: 234, listings: 45 },
  { name: 'Happy Tails Haven', location: 'Manchester', adoptions: 198, listings: 38 },
  { name: 'Second Chance Animals', location: 'Birmingham', adoptions: 176, listings: 42 },
  { name: 'Forever Home Rescue', location: 'Leeds', adoptions: 154, listings: 31 },
  { name: 'Animal Angels UK', location: 'Bristol', adoptions: 142, listings: 29 }
];

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30days');

  const totalAdopters = userGrowthData[userGrowthData.length - 1].adopters;
  const totalRescues = userGrowthData[userGrowthData.length - 1].rescues;
  const weeklyAdoptions = adoptionData.reduce((sum, day) => sum + day.adoptions, 0);
  const totalListings = petTypeDistribution.reduce((sum, pet) => sum + pet.count, 0);

  const maxAdoptionValue = Math.max(...adoptionData.map(d => d.adoptions));

  const calculatePieSlices = () => {
    const total = petTypeDistribution.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;

    return petTypeDistribution.map(item => {
      const percentage = item.count / total;
      const angle = percentage * 360;
      const slice = {
        ...item,
        percentage: (percentage * 100).toFixed(1),
        startAngle: currentAngle,
        endAngle: currentAngle + angle
      };
      currentAngle += angle;
      return slice;
    });
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describePieArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', x, y,
      'Z'
    ].join(' ');
  };

  const pieSlices = calculatePieSlices();

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Platform Analytics</Heading>
          <Text>Comprehensive analytics and data insights</Text>
        </HeaderLeft>
        <HeaderActions>
          <FilterBar style={{ padding: '0.5rem 0.75rem', marginBottom: 0 }}>
            <FilterGroup style={{ minWidth: '140px', marginBottom: 0 }}>
              <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="12months">Last 12 Months</option>
              </Select>
            </FilterGroup>
          </FilterBar>
          <Button variant="outline" size="md">
            <FiDownload style={{ marginRight: '0.5rem' }} />
            Export Report
          </Button>
        </HeaderActions>
      </PageHeader>

      <StatsBar>
        <StatCard>
          <StatIcon $color="#667eea">
            <FiUsers />
          </StatIcon>
          <StatDetails>
            <StatLabel>Total Adopters</StatLabel>
            <StatValue>{totalAdopters.toLocaleString()}</StatValue>
            <MetricChange $positive={true}>
              <FiTrendingUp />
              +14.2% vs last period
            </MetricChange>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#10b981">
            <FiHeart />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Rescues</StatLabel>
            <StatValue>{totalRescues}</StatValue>
            <MetricChange $positive={true}>
              <FiTrendingUp />
              +10.4% vs last period
            </MetricChange>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#f59e0b">
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Weekly Adoptions</StatLabel>
            <StatValue>{weeklyAdoptions}</StatValue>
            <MetricChange $positive={false}>
              <FiTrendingDown />
              -3.8% vs last week
            </MetricChange>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#ec4899">
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Listings</StatLabel>
            <StatValue>{totalListings.toLocaleString()}</StatValue>
            <MetricChange $positive={true}>
              <FiTrendingUp />
              +8.3% vs last period
            </MetricChange>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <AnalyticsGrid>
        <ChartCard>
          <CardHeader>
            <CardTitle>User Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <LineChart>
                <LineChartGrid>
                  {[1000, 750, 500, 250, 0].map((value) => (
                    <GridLine key={value}>
                      <span>{value}</span>
                    </GridLine>
                  ))}
                </LineChartGrid>
                <LineChartSVG>
                  <polyline
                    fill="none"
                    stroke="#667eea"
                    strokeWidth="3"
                    points={userGrowthData.map((d, i) => {
                      const x = (i / (userGrowthData.length - 1)) * 100;
                      const y = 100 - (d.adopters / 1000) * 100;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                  />
                  {userGrowthData.map((d, i) => {
                    const x = (i / (userGrowthData.length - 1)) * 100;
                    const y = 100 - (d.adopters / 1000) * 100;
                    return (
                      <circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="4"
                        fill="#667eea"
                      />
                    );
                  })}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    points={userGrowthData.map((d, i) => {
                      const x = (i / (userGrowthData.length - 1)) * 100;
                      const y = 100 - (d.rescues / 100) * 100;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                  />
                </LineChartSVG>
                <LineChartLabels>
                  {userGrowthData.map(d => (
                    <span key={d.month}>{d.month}</span>
                  ))}
                </LineChartLabels>
              </LineChart>
            </ChartContainer>
          </CardContent>
        </ChartCard>

        <ChartCard>
          <CardHeader>
            <CardTitle>Weekly Adoptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <BarChart>
                {adoptionData.map((day) => (
                  <Bar
                    key={day.day}
                    $height={(day.adoptions / maxAdoptionValue) * 100}
                    $color={day.day === 'Sat' || day.day === 'Sun' ? '#667eea' : '#10b981'}
                  >
                    <BarValue>{day.adoptions}</BarValue>
                    <BarLabel>{day.day}</BarLabel>
                  </Bar>
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </ChartCard>

        <ChartCard>
          <CardHeader>
            <CardTitle>Pet Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartContainer>
              <PieChart viewBox="0 0 200 200">
                {pieSlices.map((slice, i) => (
                  <path
                    key={i}
                    d={describePieArc(100, 100, 80, slice.startAngle, slice.endAngle)}
                    fill={slice.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}
              </PieChart>
              <PieLegend>
                {pieSlices.map((slice) => (
                  <LegendItem key={slice.type}>
                    <LegendColor $color={slice.color} />
                    <LegendLabel>{slice.type}</LegendLabel>
                    <LegendValue>{slice.percentage}%</LegendValue>
                  </LegendItem>
                ))}
              </PieLegend>
            </PieChartContainer>
          </CardContent>
        </ChartCard>

        <ChartCard>
          <CardHeader>
            <CardTitle>Top Performing Rescues</CardTitle>
          </CardHeader>
          <CardContent>
            <TopItemsList>
              {topRescues.map((rescue, index) => (
                <TopItem key={rescue.name}>
                  <TopItemRank>{index + 1}</TopItemRank>
                  <TopItemInfo>
                    <TopItemName>{rescue.name}</TopItemName>
                    <TopItemMeta>{rescue.location} • {rescue.listings} active listings</TopItemMeta>
                  </TopItemInfo>
                  <TopItemValue>{rescue.adoptions}</TopItemValue>
                </TopItem>
              ))}
            </TopItemsList>
          </CardContent>
        </ChartCard>
      </AnalyticsGrid>
    </PageContainer>
  );
};

export default Analytics;
