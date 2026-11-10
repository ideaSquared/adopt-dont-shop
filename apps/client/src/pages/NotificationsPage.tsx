import React from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import {
  Button,
  EmptyState,
  PageHeader,
  QueryBoundary,
  Skeleton,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import type { Notification } from '@adopt-dont-shop/lib.notifications';
import * as styles from './NotificationsPage.css';

export const NotificationsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useNotifications();
  const { trackPageView, trackEvent } = useAnalytics();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    trackPageView('/notifications');
    trackEvent({
      category: 'notifications',
      action: 'page_viewed',
      label: 'notifications_page',
      sessionId: 'notifications-session',
      timestamp: new Date(),
      properties: {
        total_notifications: notifications.length,
        unread_count: unreadCount,
      },
    });
  }, [isAuthenticated, trackPageView, trackEvent, notifications.length, unreadCount]);

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  const handleNotificationClick = (notification: Notification) => {
    const notificationId = notification.id;
    if (!isNotificationRead(notification)) {
      markAsRead(notificationId);
      trackEvent({
        category: 'notifications',
        action: 'notification_read',
        label: 'notification_clicked',
        sessionId: 'notifications-session',
        timestamp: new Date(),
        properties: {
          notification_id: notificationId,
        },
      });
    }
    openTarget(notification.actionUrl);
  };

  const openTarget = (actionUrl: string | undefined) => {
    if (!actionUrl) {
      return;
    }
    if (actionUrl.startsWith('/') && !actionUrl.startsWith('//')) {
      navigate(actionUrl);
      return;
    }
    if (/^https?:\/\//i.test(actionUrl)) {
      window.location.assign(actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead('bulk_mark_read');
    trackEvent({
      category: 'notifications',
      action: 'mark_all_read',
      label: 'bulk_action',
      sessionId: 'notifications-session',
      timestamp: new Date(),
      properties: {
        notifications_marked: unreadCount,
      },
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return formatDisplayDate(date);
    }
  };

  const isNotificationRead = (notification: Notification) => {
    return !!notification.readAt;
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title='Notifications'
        actions={
          unreadCount > 0 ? (
            <Button variant='outline' onClick={handleMarkAllAsRead}>
              Mark All Read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      <QueryBoundary
        isLoading={isLoading}
        isEmpty={notifications.length === 0}
        loadingFallback={
          <div className={styles.loadingList} aria-busy='true'>
            <Skeleton height='72px' />
            <Skeleton height='72px' />
            <Skeleton height='72px' />
          </div>
        }
        emptyFallback={
          <EmptyState
            icon={<span aria-hidden='true'>🔔</span>}
            title='No notifications yet'
            description="You'll see notifications about your adoption applications, favourite pets, and more here."
          />
        }
      >
        <ul className={styles.list}>
          {notifications.map(notification => (
            <li key={notification.id}>
              <button
                type='button'
                className={styles.notificationItem({ isRead: isNotificationRead(notification) })}
                onClick={() => handleNotificationClick(notification)}
              >
                <span className={styles.notificationContent}>
                  <span className={styles.title}>
                    {!isNotificationRead(notification) && (
                      <span className={styles.srOnly}>Unread: </span>
                    )}
                    {notification.title}
                  </span>
                  <span className={styles.message}>{notification.message}</span>
                  <span className={styles.timestamp}>
                    {formatTimestamp(notification.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {hasMore && (
          <div className={styles.loadMore}>
            <Button
              variant='outline'
              onClick={() => loadMore()}
              disabled={isLoadingMore}
              aria-label='Load more notifications'
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
};
