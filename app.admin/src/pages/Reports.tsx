import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button } from '@adopt-dont-shop/lib.components';
import {
  FiDownload,
  FiFileText,
  FiCalendar,
  FiUsers,
  FiBarChart2,
  FiTrendingUp,
  FiActivity,
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
  FilterBar,
  FilterGroup,
  FilterLabel,
  Select,
  Badge,
} from '../components/ui';

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
`;

const ReportCard = styled(Card)`
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const ReportIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const ReportTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
`;

const ReportDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
  line-height: 1.5;
`;

const ReportMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const ReportFrequency = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #6b7280;

  svg {
    font-size: 0.875rem;
  }
`;

const ReportActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const GenerateButton = styled(Button)`
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
`;

const ScheduledReportsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ScheduledReportItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`;

const ScheduledReportInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const ScheduledReportIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  font-size: 1.25rem;
`;

const ScheduledReportDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ScheduledReportName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
`;

const ScheduledReportSchedule = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const ScheduledReportStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const LastRun = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const QuickStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const QuickStatCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const QuickStatIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  font-size: 1.5rem;
`;

const QuickStatDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const QuickStatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const QuickStatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
`;

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  frequency: string;
  category: 'operational' | 'financial' | 'analytics' | 'compliance';
}

interface ScheduledReport {
  id: string;
  reportId: string;
  name: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused';
  icon: React.ReactNode;
  color: string;
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'user-activity',
    name: 'User Activity Report',
    description:
      'Comprehensive breakdown of user registrations, active users, and engagement metrics',
    icon: <FiUsers />,
    color: '#667eea',
    frequency: 'Daily/Weekly/Monthly',
    category: 'operational',
  },
  {
    id: 'adoption-metrics',
    name: 'Adoption Metrics Report',
    description: 'Success rates, adoption trends, and time-to-adoption analytics',
    icon: <FiTrendingUp />,
    color: '#10b981',
    frequency: 'Weekly/Monthly',
    category: 'analytics',
  },
  {
    id: 'rescue-performance',
    name: 'Rescue Performance Report',
    description: 'Individual rescue organization statistics, listing counts, and success rates',
    icon: <FiBarChart2 />,
    color: '#f59e0b',
    frequency: 'Monthly/Quarterly',
    category: 'analytics',
  },
  {
    id: 'platform-health',
    name: 'Platform Health Report',
    description: 'System uptime, response times, error rates, and performance metrics',
    icon: <FiActivity />,
    color: '#ec4899',
    frequency: 'Daily/Weekly',
    category: 'operational',
  },
  {
    id: 'moderation-summary',
    name: 'Moderation Summary',
    description: 'Content moderation actions, flagged items, and resolution statistics',
    icon: <FiCheckCircle />,
    color: '#8b5cf6',
    frequency: 'Weekly/Monthly',
    category: 'compliance',
  },
  {
    id: 'financial-overview',
    name: 'Financial Overview',
    description: 'Revenue, subscriptions, and financial transaction summaries',
    icon: <FiFileText />,
    color: '#14b8a6',
    frequency: 'Monthly/Quarterly',
    category: 'financial',
  },
];

const scheduledReports: ScheduledReport[] = [
  {
    id: 'sched-1',
    reportId: 'user-activity',
    name: 'Weekly User Activity',
    schedule: 'Every Monday at 9:00 AM',
    lastRun: '2024-10-21T09:00:00Z',
    nextRun: '2024-10-28T09:00:00Z',
    status: 'active',
    icon: <FiUsers />,
    color: '#667eea',
  },
  {
    id: 'sched-2',
    reportId: 'adoption-metrics',
    name: 'Monthly Adoption Metrics',
    schedule: 'First day of month at 8:00 AM',
    lastRun: '2024-10-01T08:00:00Z',
    nextRun: '2024-11-01T08:00:00Z',
    status: 'active',
    icon: <FiTrendingUp />,
    color: '#10b981',
  },
  {
    id: 'sched-3',
    reportId: 'platform-health',
    name: 'Daily Health Check',
    schedule: 'Daily at 6:00 AM',
    lastRun: '2024-10-21T06:00:00Z',
    nextRun: '2024-10-22T06:00:00Z',
    status: 'active',
    icon: <FiActivity />,
    color: '#ec4899',
  },
];

const Reports: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('30days');

  const filteredReports = reportTemplates.filter(
    report => categoryFilter === 'all' || report.category === categoryFilter
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'operational':
        return <Badge $variant='info'>Operational</Badge>;
      case 'financial':
        return <Badge $variant='success'>Financial</Badge>;
      case 'analytics':
        return <Badge $variant='warning'>Analytics</Badge>;
      case 'compliance':
        return <Badge $variant='danger'>Compliance</Badge>;
      default:
        return <Badge $variant='neutral'>{category}</Badge>;
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Reports & Exports</Heading>
          <Text>Generate custom reports and schedule automated exports</Text>
        </HeaderLeft>
        <HeaderActions>
          <FilterBar style={{ padding: '0.5rem 0.75rem', marginBottom: 0 }}>
            <FilterGroup style={{ minWidth: '140px', marginBottom: 0 }}>
              <Select value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option value='7days'>Last 7 Days</option>
                <option value='30days'>Last 30 Days</option>
                <option value='90days'>Last 90 Days</option>
                <option value='12months'>Last 12 Months</option>
                <option value='custom'>Custom Range</option>
              </Select>
            </FilterGroup>
          </FilterBar>
        </HeaderActions>
      </PageHeader>

      <QuickStatsGrid>
        <QuickStatCard>
          <QuickStatIcon $color='#667eea'>
            <FiFileText />
          </QuickStatIcon>
          <QuickStatDetails>
            <QuickStatLabel>Reports Generated</QuickStatLabel>
            <QuickStatValue>142</QuickStatValue>
          </QuickStatDetails>
        </QuickStatCard>

        <QuickStatCard>
          <QuickStatIcon $color='#10b981'>
            <FiCalendar />
          </QuickStatIcon>
          <QuickStatDetails>
            <QuickStatLabel>Scheduled Reports</QuickStatLabel>
            <QuickStatValue>{scheduledReports.length}</QuickStatValue>
          </QuickStatDetails>
        </QuickStatCard>

        <QuickStatCard>
          <QuickStatIcon $color='#f59e0b'>
            <FiDownload />
          </QuickStatIcon>
          <QuickStatDetails>
            <QuickStatLabel>Exports This Month</QuickStatLabel>
            <QuickStatValue>38</QuickStatValue>
          </QuickStatDetails>
        </QuickStatCard>
      </QuickStatsGrid>

      <Card>
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
          <FilterGroup style={{ minWidth: '180px', marginBottom: 0 }}>
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value='all'>All Categories</option>
              <option value='operational'>Operational</option>
              <option value='financial'>Financial</option>
              <option value='analytics'>Analytics</option>
              <option value='compliance'>Compliance</option>
            </Select>
          </FilterGroup>
        </CardHeader>
        <CardContent>
          <ReportsGrid>
            {filteredReports.map(report => (
              <ReportCard key={report.id}>
                <ReportIcon $color={report.color}>{report.icon}</ReportIcon>
                <ReportTitle>{report.name}</ReportTitle>
                <ReportDescription>{report.description}</ReportDescription>
                <ReportMeta>
                  <ReportFrequency>
                    <FiCalendar />
                    {report.frequency}
                  </ReportFrequency>
                  <ReportActions>{getCategoryBadge(report.category)}</ReportActions>
                </ReportMeta>
                <div style={{ marginTop: '1rem' }}>
                  <GenerateButton
                    variant='primary'
                    size='sm'
                    onClick={e => {
                      e.stopPropagation();
                      console.log('Generate report:', report.id);
                    }}
                  >
                    <FiDownload style={{ marginRight: '0.5rem' }} />
                    Generate Report
                  </GenerateButton>
                </div>
              </ReportCard>
            ))}
          </ReportsGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <Button variant='outline' size='sm'>
            <FiCalendar style={{ marginRight: '0.5rem' }} />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          <ScheduledReportsSection>
            {scheduledReports.map(report => (
              <ScheduledReportItem key={report.id}>
                <ScheduledReportInfo>
                  <ScheduledReportIcon $color={report.color}>{report.icon}</ScheduledReportIcon>
                  <ScheduledReportDetails>
                    <ScheduledReportName>{report.name}</ScheduledReportName>
                    <ScheduledReportSchedule>{report.schedule}</ScheduledReportSchedule>
                  </ScheduledReportDetails>
                </ScheduledReportInfo>
                <ScheduledReportStatus>
                  <LastRun>Last run: {formatDate(report.lastRun)}</LastRun>
                  <Badge $variant={report.status === 'active' ? 'success' : 'neutral'}>
                    {report.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => console.log('Edit schedule:', report.id)}
                  >
                    Edit
                  </Button>
                </ScheduledReportStatus>
              </ScheduledReportItem>
            ))}
          </ScheduledReportsSection>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default Reports;
