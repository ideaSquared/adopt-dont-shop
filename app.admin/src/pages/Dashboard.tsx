import React from 'react';
import { Heading, Text } from '@adopt-dont-shop/lib.components';
import { usePlatformMetrics } from '../hooks';
import styles from './Dashboard.css';

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
};

const Dashboard: React.FC = () => {
  const { data, isLoading, isError, error } = usePlatformMetrics();

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
        },
        {
          icon: '🏠',
          label: 'Active Rescues',
          value: formatNumber(data.rescues.verified),
          change: `${formatNumber(data.rescues.pending)} pending verification`,
          positive: data.rescues.pending === 0,
        },
        {
          icon: '🐾',
          label: 'Pets Listed',
          value: formatNumber(data.pets.available),
          change: `${formatNumber(data.pets.total)} total pets`,
          positive: true,
        },
        {
          icon: '❤️',
          label: 'Adoptions (30d)',
          value: formatNumber(data.pets.adopted),
          change: `${formatNumber(data.applications.approved)} applications approved`,
          positive: data.pets.adopted > 0,
        },
        {
          icon: '📋',
          label: 'Pending Applications',
          value: formatNumber(data.applications.pending),
          change: `${formatNumber(data.applications.total)} total this month`,
          positive: data.applications.pending === 0,
        },
        {
          icon: '🎫',
          label: 'New Users (30d)',
          value: formatNumber(data.users.newThisMonth),
          change: `${formatNumber(data.users.active)} active users`,
          positive: data.users.newThisMonth > 0,
        },
      ]
    : [];

  return (
    <div className={styles.dashboardContainer}>
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
                  <div className={styles.skeletonBlock} style={{ width: '32px', height: '32px' }} />
                  <div
                    className={styles.skeletonBlock}
                    style={{ width: '120px', height: '0.875rem' }}
                  />
                </div>
                <div
                  className={styles.skeletonBlock}
                  style={{ width: '80px', height: '2.25rem', marginBottom: '0.5rem' }}
                />
                <div
                  className={styles.skeletonBlock}
                  style={{ width: '140px', height: '0.875rem' }}
                />
              </div>
            ))
          : metrics.map((metric, index) => (
              <div key={index} className={styles.metricCard}>
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
              </div>
            ))}
      </div>

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          📊 Additional dashboard widgets will be added here: recent activity, charts, alerts, etc.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
