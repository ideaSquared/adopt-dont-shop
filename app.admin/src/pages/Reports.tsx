import React, { useState } from 'react';
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
import * as styles from './Reports.css';

const headerActions = styles.headerActions;

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
        <div className={styles.headerActions}>
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
        </div>
      </PageHeader>

      <div className={styles.quickStatsGrid}>
        <div className={styles.quickStatCard}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#667eea20',
              color: '#667eea',
              fontSize: '1.5rem',
            }}
          >
            <FiFileText />
          </div>
          <div className={styles.quickStatDetails}>
            <div className={styles.quickStatLabel}>Reports Generated</div>
            <div className={styles.quickStatValue}>142</div>
          </div>
        </div>

        <div className={styles.quickStatCard}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#10b98120',
              color: '#10b981',
              fontSize: '1.5rem',
            }}
          >
            <FiCalendar />
          </div>
          <div className={styles.quickStatDetails}>
            <div className={styles.quickStatLabel}>Scheduled Reports</div>
            <div className={styles.quickStatValue}>{scheduledReports.length}</div>
          </div>
        </div>

        <div className={styles.quickStatCard}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f59e0b20',
              color: '#f59e0b',
              fontSize: '1.5rem',
            }}
          >
            <FiDownload />
          </div>
          <div className={styles.quickStatDetails}>
            <div className={styles.quickStatLabel}>Exports This Month</div>
            <div className={styles.quickStatValue}>38</div>
          </div>
        </div>
      </div>

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
          <div className={styles.reportsGrid}>
            {filteredReports.map(report => (
              <Card key={report.id} className={styles.reportCard}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${report.color}20`,
                    color: report.color,
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  {report.icon}
                </div>
                <h3 className={styles.reportTitle}>{report.name}</h3>
                <p className={styles.reportDescription}>{report.description}</p>
                <div className={styles.reportMeta}>
                  <div className={styles.reportFrequency}>
                    <FiCalendar />
                    {report.frequency}
                  </div>
                  <div className={styles.reportActions}>{getCategoryBadge(report.category)}</div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    variant='primary'
                    size='sm'
                    onClick={e => {
                      e.stopPropagation();
                      console.log('Generate report:', report.id);
                    }}
                  >
                    <FiDownload style={{ marginRight: '0.5rem' }} />
                    Generate Report
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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
          <div className={styles.scheduledReportsSection}>
            {scheduledReports.map(report => (
              <div key={report.id} className={styles.scheduledReportItem}>
                <div className={styles.scheduledReportInfo}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${report.color}20`,
                      color: report.color,
                      fontSize: '1.25rem',
                    }}
                  >
                    {report.icon}
                  </div>
                  <div className={styles.scheduledReportDetails}>
                    <div className={styles.scheduledReportName}>{report.name}</div>
                    <div className={styles.scheduledReportSchedule}>{report.schedule}</div>
                  </div>
                </div>
                <div className={styles.scheduledReportStatus}>
                  <div className={styles.lastRun}>Last run: {formatDate(report.lastRun)}</div>
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
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default Reports;
