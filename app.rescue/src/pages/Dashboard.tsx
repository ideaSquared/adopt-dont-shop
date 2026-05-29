import React, { useState } from 'react';
import { Card, Container, Heading, Text } from '@adopt-dont-shop/lib.components';
import { useAuth, STORAGE_KEYS } from '@adopt-dont-shop/lib.auth';
import { useDashboardData } from '../hooks';
import { UnreadMessagesPanel } from '../components/dashboard/UnreadMessagesPanel';
import { DashboardSkeleton } from '../components/skeletons';
import { formatRelativeDate } from '@adopt-dont-shop/lib.utils';
import { apiService } from '../services/libraryServices';
import * as styles from './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardData, recentActivities, notifications, loading, error } = useDashboardData();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  if (loading) {
    return (
      <Container className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <Heading level="h1">Rescue Dashboard</Heading>
        </div>
        <DashboardSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <Heading level="h1">Rescue Dashboard</Heading>
          <Text>Welcome back! Here's what's happening with your rescue today.</Text>
        </div>
        <Card>
          <div className={styles.errorCard}>
            <Text className={styles.errorMessage}>⚠️ Unable to load dashboard data: {error}</Text>
            <Text className={styles.errorHint}>
              This usually indicates an authentication issue. Please try logging in again.
            </Text>
            <div className={styles.errorActions}>
              <button onClick={() => window.location.reload()} className={styles.refreshButton}>
                Refresh Page
              </button>
              <button
                onClick={() => {
                  // Clear only auth-related keys rather than all localStorage,
                  // to avoid wiping unrelated user preferences (theme, etc.).
                  localStorage.removeItem(STORAGE_KEYS.USER);
                  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                  apiService.clearCsrfToken();
                  window.location.reload();
                }}
                className={styles.clearAuthButton}
              >
                Clear Auth & Restart
              </button>
            </div>
          </div>
        </Card>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <Heading level="h1">Rescue Dashboard</Heading>
          <Text>No dashboard data available.</Text>
        </div>
      </Container>
    );
  }

  const {
    totalPets,
    successfulAdoptions,
    pendingApplications,
    adoptionRate,
    monthlyAdoptions,
    petStatusDistribution,
  } = dashboardData;

  return (
    <Container className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <Heading level="h1">Rescue Dashboard</Heading>
        <Text>Welcome back! Here's what's happening with your rescue today.</Text>
      </div>

      {/* Welcome Message for Current User */}
      <div className={styles.welcomeMessage}>
        <h2>Welcome back, {user?.firstName || 'Team Member'}! 👋</h2>
        <p>
          You're logged in as a {user?.userType?.replace('_', ' ') || 'rescue staff member'}. Here's
          your rescue overview for today.
        </p>
      </div>

      {/* First-time-user onboarding banner */}
      {!onboardingDismissed && totalPets === 0 && pendingApplications === 0 && (
        <div className={styles.onboardingBanner} data-testid="onboarding-banner">
          <div className={styles.onboardingContent}>
            <h3 className={styles.onboardingTitle}>
              Welcome! Get started with your rescue dashboard
            </h3>
            <p className={styles.onboardingText}>
              Start by adding your first pet or inviting team members to help manage your rescue.
            </p>
            <div className={styles.onboardingActions}>
              <a href="/pets" className={styles.onboardingLink}>
                Add your first pet
              </a>
              <a href="/staff" className={styles.onboardingLink}>
                Invite team members
              </a>
            </div>
          </div>
          <button
            type="button"
            className={styles.onboardingDismiss}
            onClick={() => setOnboardingDismissed(true)}
            aria-label="Dismiss onboarding banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* ADS-643: Unread adopter messages — surfaced above the non-urgent
          metrics so rescue staff see new conversations first on every viewport. */}
      <UnreadMessagesPanel />

      {/* Key Metrics Row */}
      <div className={styles.metricsGrid}>
        <Card>
          <div className={styles.metricCardBody}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricEmoji}>🐕</span>
              <Text className={styles.metricLabel}>Total Pets</Text>
            </div>
            <Text className={styles.metricValue}>{totalPets}</Text>
            <Text className={styles.metricDeltaUp}>↑ 5% from last month</Text>
          </div>
        </Card>

        <Card>
          <div className={styles.metricCardBody}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricEmoji}>❤️</span>
              <Text className={styles.metricLabel}>Successful Adoptions</Text>
            </div>
            <Text className={styles.metricValue}>{successfulAdoptions}</Text>
            <Text className={styles.metricDeltaUp}>↑ 12% from last month</Text>
          </div>
        </Card>

        <Card>
          <div className={styles.metricCardBody}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricEmoji}>📋</span>
              <Text className={styles.metricLabel}>Pending Applications</Text>
            </div>
            <Text className={styles.metricValue}>{pendingApplications}</Text>
            <Text className={styles.metricDeltaDown}>↓ 2% from last month</Text>
          </div>
        </Card>

        <Card>
          <div className={styles.metricCardBody}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricEmoji}>📊</span>
              <Text className={styles.metricLabel}>Adoption Rate</Text>
            </div>
            <Text className={styles.metricValue}>{adoptionRate}%</Text>
            <Text className={styles.metricDeltaUp}>↑ 3% from last month</Text>
          </div>
        </Card>
      </div>

      {/* Charts and Analytics Row */}
      <div className={styles.analyticsGrid}>
        <Card>
          <div className={styles.cardSectionHeader}>
            <Heading level="h3" className={styles.cardSectionHeading}>
              Monthly Adoptions
            </Heading>
          </div>
          <div className={styles.cardSectionBody}>
            <div className={styles.chartArea}>
              {monthlyAdoptions.map(item => (
                <div key={item.month} className={styles.chartColumn}>
                  <div
                    className={styles.chartBar}
                    style={{ height: `${(item.adoptions / 23) * 100}%` }}
                    title={`${item.month}: ${item.adoptions} adoptions`}
                  />
                  <Text className={styles.chartMonthLabel}>{item.month}</Text>
                  <Text className={styles.chartValueLabel}>{item.adoptions}</Text>
                </div>
              ))}
            </div>
            <div className={styles.chartSummary}>
              <Text className={styles.chartSummaryRow}>
                <strong>Total Adoptions: </strong>
                {monthlyAdoptions.reduce((sum, item) => sum + item.adoptions, 0)}
              </Text>
              <Text className={styles.chartSummaryRow}>
                <strong>Best Month: </strong>
                {
                  monthlyAdoptions.reduce((best, current) =>
                    current.adoptions > best.adoptions ? current : best
                  ).month
                }
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div className={styles.cardSectionHeader}>
            <Heading level="h3" className={styles.cardSectionHeading}>
              Pet Status Distribution
            </Heading>
          </div>
          <div className={styles.cardSectionBody}>
            <div className={styles.statusList}>
              {petStatusDistribution.map(status => (
                <div key={status.name} className={styles.statusRow}>
                  <div className={styles.statusLabelWrap}>
                    <div className={styles.statusDot} style={{ backgroundColor: status.color }} />
                    <Text className={styles.statusName}>{status.name}</Text>
                  </div>
                  <Text className={styles.statusValueChip}>{status.value}</Text>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className={styles.cardSectionHeader}>
            <Heading level="h3" className={styles.cardSectionHeading}>
              Recent Activity
            </Heading>
          </div>
          <div className={styles.cardSectionBody}>
            <div className={styles.activityList}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => {
                  const isLast = index === recentActivities.length - 1;
                  return (
                    <div
                      key={activity.id}
                      className={isLast ? styles.activityItemLast : styles.activityItem}
                    >
                      <Text className={styles.activityTimestamp}>
                        {formatRelativeDate(activity.timestamp)}
                      </Text>
                      <Text className={styles.activityMessage}>{activity.message}</Text>
                    </div>
                  );
                })
              ) : (
                <Text className={styles.emptyActivityMessage}>No recent activities</Text>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <Card className={styles.notificationsCard}>
        <div className={styles.cardSectionHeader}>
          <Heading level="h3" className={styles.notificationsHeading}>
            Recent Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <span className={styles.unreadBadge}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </Heading>
        </div>
        <div className={styles.notificationsBody}>
          {notifications.length > 0 ? (
            notifications.map(notification => {
              const getNotificationIcon = (type: string) => {
                switch (type) {
                  case 'success':
                    return '✅';
                  case 'warning':
                    return '⚠️';
                  case 'error':
                    return '❌';
                  default:
                    return 'ℹ️';
                }
              };

              return (
                <div
                  key={notification.id}
                  className={`${styles.notificationRowBase} ${
                    notification.read ? styles.notificationRowRead : styles.notificationRowUnread
                  }`}
                >
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <Text className={styles.notificationTitle}>{notification.title}</Text>
                    <Text className={styles.notificationBody}>{notification.message}</Text>
                    <Text className={styles.notificationTimestamp}>
                      {formatRelativeDate(notification.timestamp)}
                    </Text>
                  </div>
                  {!notification.read && <div className={styles.unreadDot} />}
                </div>
              );
            })
          ) : (
            <Text className={styles.emptyNotifications}>No notifications</Text>
          )}
        </div>
        <div className={styles.notificationsFooter}>
          <button className={styles.viewAllButton}>View All Notifications</button>
        </div>
      </Card>
    </Container>
  );
};

export default Dashboard;
