import React from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { Button, Card } from '@adopt-dont-shop/lib.components';
import * as styles from './NotificationsPage.css';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { trackPageView, trackEvent } = useAnalytics();

  React.useEffect(() => {
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
  }, [trackPageView, trackEvent, notifications.length, unreadCount]);

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
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
      return date.toLocaleDateString();
    }
  };

  const isNotificationRead = (notification: any) => {
    return !!notification.readAt;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <Button variant='outline' onClick={handleMarkAllAsRead}>
            Mark All Read ({unreadCount})
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className='icon'>🔔</div>
          <h3>No notifications yet</h3>
          <p>
            You'll see notifications about your adoption applications, favorite pets, and more here.
          </p>
        </div>
      ) : (
        notifications.map(notification => (
          <Card
            key={notification.id}
            className={styles.notificationCard({ isRead: isNotificationRead(notification) })}
            onClick={() =>
              handleNotificationClick(notification.id, isNotificationRead(notification))
            }
          >
            <div className={styles.notificationContent}>
              <div className='title'>{notification.title}</div>
              <div className='message'>{notification.message}</div>
              <div className='timestamp'>{formatTimestamp(notification.createdAt)}</div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
