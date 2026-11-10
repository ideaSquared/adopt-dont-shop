import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Container,
  Heading,
  MetricCard,
  PageHeader,
  Text,
} from '@adopt-dont-shop/lib.components';
import {
  ChartColumnIncreasing,
  CircleCheck,
  CircleX,
  ClipboardList,
  Heart,
  Info,
  PawPrint,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useAuth, authService, STORAGE_KEYS } from '@adopt-dont-shop/lib.auth';
import { useDashboardData } from '../hooks';
import { UnreadMessagesPanel } from '../components/dashboard/UnreadMessagesPanel';
import { DashboardSkeleton } from '../components/skeletons';
import { formatRelativeDate } from '@adopt-dont-shop/lib.utils';
import { apiService } from '../services/libraryServices';
import * as styles from './Dashboard.css';

const notificationIcons: Record<string, typeof Info> = {
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardData, recentActivities, notifications, loading, error } = useDashboardData();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  if (loading) {
    return (
      <Container className={styles.dashboardContainer}>
        <PageHeader title="Rescue Dashboard" />
        <DashboardSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className={styles.dashboardContainer}>
        <PageHeader
          title="Rescue Dashboard"
          description="Welcome back! Here's what's happening with your rescue today."
        />
        <Card>
          <div className={styles.errorCard}>
            <Alert variant="error">Unable to load dashboard data: {error}</Alert>
            <Text className={styles.errorHint}>
              This usually indicates an authentication issue. Please try logging in again.
            </Text>
            <div className={styles.errorActions}>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Clear only auth-related client state rather than all
                  // localStorage, to avoid wiping unrelated user preferences
                  // (theme, etc.). The access/refresh tokens themselves are
                  // HttpOnly cookies and can't be cleared from here — this
                  // drops the JS-visible session marker + cached user/CSRF
                  // state so a stale session doesn't keep rendering.
                  localStorage.removeItem(STORAGE_KEYS.USER);
                  authService.clearTokens();
                  apiService.clearCsrfToken();
                  window.location.reload();
                }}
              >
                Clear Auth & Restart
              </Button>
            </div>
          </div>
        </Card>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container className={styles.dashboardContainer}>
        <PageHeader title="Rescue Dashboard" description="No dashboard data available." />
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
      <PageHeader
        title="Rescue Dashboard"
        description="Welcome back! Here's what's happening with your rescue today."
      />

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
          <Button
            variant="ghost"
            size="sm"
            className={styles.onboardingDismiss}
            onClick={() => setOnboardingDismissed(true)}
            aria-label="Dismiss onboarding banner"
          >
            <X size="1em" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* ADS-643: Unread adopter messages — surfaced above the non-urgent
          metrics so rescue staff see new conversations first on every viewport. */}
      <UnreadMessagesPanel />

      {/* Key Metrics Row */}
      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<PawPrint size="1em" />}
          label="Total Pets"
          value={totalPets}
          helperText="↑ 5% from last month"
        />
        <MetricCard
          icon={<Heart size="1em" />}
          label="Successful Adoptions"
          value={successfulAdoptions}
          helperText="↑ 12% from last month"
        />
        <MetricCard
          icon={<ClipboardList size="1em" />}
          label="Pending Applications"
          value={pendingApplications}
          helperText="↓ 2% from last month"
        />
        <MetricCard
          icon={<ChartColumnIncreasing size="1em" />}
          label="Adoption Rate"
          value={`${adoptionRate}%`}
          helperText="↑ 3% from last month"
        />
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
              const NotificationIcon = notificationIcons[notification.type] ?? Info;

              return (
                <div
                  key={notification.id}
                  className={`${styles.notificationRowBase} ${
                    notification.read ? styles.notificationRowRead : styles.notificationRowUnread
                  }`}
                >
                  <div className={styles.notificationIcon}>
                    <NotificationIcon size="1em" aria-hidden="true" />
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
          <Button variant="ghost" size="sm">
            View All Notifications
          </Button>
        </div>
      </Card>
    </Container>
  );
};

export default Dashboard;
