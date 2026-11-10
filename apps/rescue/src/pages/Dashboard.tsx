import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Container,
  MetricCard,
  PageHeader,
  Text,
} from '@adopt-dont-shop/lib.components';
import { ClipboardList, Heart, PawPrint, X } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth, authService, STORAGE_KEYS } from '@adopt-dont-shop/lib.auth';
import { useUnreadConversations } from '@adopt-dont-shop/lib.chat';
import { useDashboardData } from '../hooks';
import { DashboardSkeleton } from '../components/skeletons';
import { apiService } from '../services/libraryServices';
import * as styles from './Dashboard.css';

type AttentionItem = { key: string; text: string; actionLabel: string; to: string };

const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const buildAttentionItems = (
  pendingApplications: number,
  unreadMessages: number
): AttentionItem[] =>
  [
    {
      key: 'applications',
      count: pendingApplications,
      text: `${plural(pendingApplications, 'adoption application is', 'adoption applications are')} waiting for you to review.`,
      actionLabel: 'Review applications',
      to: '/applications',
    },
    {
      key: 'messages',
      count: unreadMessages,
      text: `You have ${plural(unreadMessages, 'unread message', 'unread messages')} from adopters.`,
      actionLabel: 'Read messages',
      to: '/communication',
    },
  ].filter(item => item.count > 0);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardData, loading, error } = useDashboardData();
  const { totalUnread } = useUnreadConversations();
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

  const { totalPets, successfulAdoptions, pendingApplications } = dashboardData;
  const attentionItems = buildAttentionItems(pendingApplications, totalUnread);

  return (
    <Container className={styles.dashboardContainer}>
      <PageHeader
        title="Rescue Dashboard"
        description={`Welcome back, ${user?.firstName || 'Team Member'}. Here is what needs you today.`}
      />

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

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className={styles.sectionHeading}>
          What needs your attention
        </h2>
        {attentionItems.length === 0 ? (
          <p className={styles.allClear} data-testid="all-clear">
            You are all caught up. Nothing is waiting for you right now.
          </p>
        ) : (
          <ul className={styles.attentionList} data-testid="attention-list">
            {attentionItems.map(item => (
              <li key={item.key} className={styles.attentionItem}>
                <p className={styles.attentionText}>{item.text}</p>
                <Link to={item.to} className={styles.actionLink}>
                  {item.actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className={styles.sectionHeading}>
          Common jobs
        </h2>
        <div className={styles.quickActions}>
          <Link to="/pets" className={styles.actionLink}>
            Add or update a pet
          </Link>
          <Link to="/staff" className={styles.actionLink}>
            Invite a volunteer
          </Link>
        </div>
      </section>

      <section aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className={styles.sectionHeading}>
          Your rescue at a glance
        </h2>
        <div className={styles.metricsGrid}>
          <MetricCard icon={<PawPrint size="1em" />} label="Pets listed" value={totalPets} />
          <MetricCard
            icon={<ClipboardList size="1em" />}
            label="Applications waiting"
            value={pendingApplications}
          />
          <MetricCard
            icon={<Heart size="1em" />}
            label="Adopted in the last 30 days"
            value={successfulAdoptions}
          />
        </div>
      </section>
    </Container>
  );
};

export default Dashboard;
