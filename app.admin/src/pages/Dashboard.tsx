import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Heading, Stack, Text } from '@adopt-dont-shop/lib.components';
import { useReports } from '@adopt-dont-shop/lib.moderation';
import { useTickets, formatRelativeTime } from '@adopt-dont-shop/lib.support-tickets';
import { usePlatformMetrics, useApplications } from '../hooks';
import * as styles from './Dashboard.css';

const formatNumber = (n: number): string => n.toLocaleString();

const formatGrowthLabel = (current: number, previous: number, label: string): string => {
  if (previous === 0) {
    return `${label}`;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}% from last month`;
};

type MetricDefinition = {
  icon: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  href: string;
};

// Minimal local row shapes used by the attention panel. We can't rely on
// types from `@adopt-dont-shop/lib.moderation` / `lib.support-tickets`
// resolving at this app's `tsc --noEmit` step (libs are only built when
// `build` is run with `^build`), so this keeps strict-mode happy without
// reaching for `any`.
type AttentionReport = { reportId: string; title: string };
type AttentionTicket = { ticketId: string; subject: string; updatedAt: Date | string };

const Dashboard: React.FC = () => {
  const { data, isLoading, isError, error } = usePlatformMetrics();

  // Attention panel data sources — each uses the existing list endpoints
  // with sort+limit query params (no dedicated top-N endpoints yet).
  const { data: criticalReportsData } = useReports({
    status: 'pending',
    severity: 'critical',
    page: 1,
    limit: 3,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data: oldestPendingApp } = useApplications({
    status: 'submitted',
    page: 1,
    limit: 1,
  });

  const { data: escalatedTicketsData } = useTickets({
    status: 'escalated',
    page: 1,
    limit: 3,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const metrics: MetricDefinition[] = data
    ? [
        {
          icon: '👥',
          label: 'Total Users',
          value: formatNumber(data.users.total),
          change: formatGrowthLabel(
            data.users.newThisMonth,
            0,
            `${formatNumber(data.users.newThisMonth)} new this month`
          ),
          positive: data.users.newThisMonth >= 0,
          href: '/users',
        },
        {
          icon: '🏠',
          label: 'Active Rescues',
          value: formatNumber(data.rescues.verified),
          change: `${formatNumber(data.rescues.pending)} pending verification`,
          positive: data.rescues.pending === 0,
          href: '/rescues?status=verified',
        },
        {
          icon: '🐾',
          label: 'Pets Listed',
          value: formatNumber(data.pets.available),
          change: `${formatNumber(data.pets.total)} total pets`,
          positive: true,
          href: '/pets?status=available',
        },
        {
          icon: '❤️',
          label: 'Adoptions (30d)',
          value: formatNumber(data.pets.adopted),
          change: `${formatNumber(data.applications.approved)} applications approved`,
          positive: data.pets.adopted > 0,
          href: '/pets?status=adopted',
        },
        {
          icon: '📋',
          label: 'Pending Applications',
          value: formatNumber(data.applications.pending),
          change: `${formatNumber(data.applications.total)} total this month`,
          positive: data.applications.pending === 0,
          href: '/applications?status=submitted',
        },
        {
          icon: '🎫',
          label: 'New Users (30d)',
          value: formatNumber(data.users.newThisMonth),
          change: `${formatNumber(data.users.active)} active users`,
          positive: data.users.newThisMonth > 0,
          href: '/users',
        },
      ]
    : [];

  const criticalReports = criticalReportsData?.data ?? [];
  const oldestApplication = oldestPendingApp?.data?.[0];
  const escalatedTickets = escalatedTicketsData?.data ?? [];

  return (
    <Stack spacing='xl' className={styles.dashboardContainer}>
      <div className={styles.pageHeader}>
        <Heading level='h1'>Admin Dashboard</Heading>
        <Text>Welcome back! Here's what's happening across the platform today.</Text>
      </div>

      {isError && (
        <div className={styles.errorBanner} role='alert'>
          Failed to load dashboard metrics:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      <div className={styles.metricsGrid}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.metricCard} aria-busy='true'>
                <div className={styles.metricHeader}>
                  <div className={clsx(styles.skeletonBlock, styles.skeletonIcon)} />
                  <div className={clsx(styles.skeletonBlock, styles.skeletonLabel)} />
                </div>
                <div className={clsx(styles.skeletonBlock, styles.skeletonValue)} />
                <div className={clsx(styles.skeletonBlock, styles.skeletonChange)} />
              </div>
            ))
          : metrics.map(metric => (
              <Link
                key={metric.label}
                to={metric.href}
                className={styles.metricCard}
                aria-label={`View ${metric.label}`}
              >
                <div className={styles.metricHeader}>
                  <span>{metric.icon}</span>
                  <div className={styles.metricLabel}>{metric.label}</div>
                </div>
                <div className={styles.metricValue}>{metric.value}</div>
                <div
                  className={
                    metric.positive ? styles.metricChangePositive : styles.metricChangeNegative
                  }
                >
                  {metric.change}
                </div>
              </Link>
            ))}
      </div>

      <section className={styles.attentionPanel} aria-label='Needs your attention'>
        <Heading level='h2'>Needs your attention</Heading>

        <div className={styles.attentionSection}>
          <div className={styles.attentionSectionHeader}>
            <h3 className={styles.attentionSectionTitle}>Critical moderation reports</h3>
            <Link
              to='/moderation?status=pending&severity=critical'
              className={styles.attentionLink}
            >
              View all
            </Link>
          </div>
          {criticalReports.length === 0 ? (
            <p className={styles.attentionEmpty}>No critical reports awaiting review.</p>
          ) : (
            <ul className={styles.attentionList}>
              {criticalReports.map((report: AttentionReport) => (
                <li key={report.reportId} className={styles.attentionItem}>
                  <Link to='/moderation?status=pending&severity=critical'>{report.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.attentionSection}>
          <div className={styles.attentionSectionHeader}>
            <h3 className={styles.attentionSectionTitle}>Oldest pending application</h3>
            <Link to='/applications?status=submitted' className={styles.attentionLink}>
              View all
            </Link>
          </div>
          {!oldestApplication ? (
            <p className={styles.attentionEmpty}>No pending applications.</p>
          ) : (
            <ul className={styles.attentionList}>
              <li className={styles.attentionItem}>
                <Link to='/applications?status=submitted'>
                  {oldestApplication.applicantName || 'Unknown applicant'} —{' '}
                  {oldestApplication.petName}
                </Link>
                <span className={styles.attentionMeta}>
                  Submitted {new Date(oldestApplication.createdAt).toLocaleDateString('en-GB')}
                </span>
              </li>
            </ul>
          )}
        </div>

        <div className={styles.attentionSection}>
          <div className={styles.attentionSectionHeader}>
            <h3 className={styles.attentionSectionTitle}>Escalated support tickets</h3>
            <Link to='/support?status=escalated' className={styles.attentionLink}>
              View all
            </Link>
          </div>
          {escalatedTickets.length === 0 ? (
            <p className={styles.attentionEmpty}>No escalated tickets.</p>
          ) : (
            <ul className={styles.attentionList}>
              {escalatedTickets.map((ticket: AttentionTicket) => (
                <li key={ticket.ticketId} className={styles.attentionItem}>
                  <Link to='/support?status=escalated'>{ticket.subject}</Link>
                  <span className={styles.attentionMeta}>
                    Updated {formatRelativeTime(ticket.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Stack>
  );
};

export default Dashboard;
