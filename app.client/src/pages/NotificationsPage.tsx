import React from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { Button, Card } from '@adopt-dont-shop/components';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  h1 {
    margin: 0;
    color: ${props => props.theme.text.primary};
  }
`;

const NotificationCard = styled(Card)<{ $isRead: boolean }>`
  margin-bottom: 1rem;
  cursor: pointer;
  opacity: ${props => (props.$isRead ? 0.6 : 1)};
  border-left: 4px solid
    ${props => (props.$isRead ? 'transparent' : props.theme.colors.primary[500])};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const NotificationContent = styled.div`
  padding: 1rem;

  .title {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: ${props => props.theme.text.primary};
  }

  .message {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 0.5rem;
  }

  .timestamp {
    font-size: 0.875rem;
    color: ${props => props.theme.text.tertiary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.text.secondary};

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
`;

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
    <Container>
      <Header>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <Button variant='outline' onClick={handleMarkAllAsRead}>
            Mark All Read ({unreadCount})
          </Button>
        )}
      </Header>

      {notifications.length === 0 ? (
        <EmptyState>
          <div className='icon'>🔔</div>
          <h3>No notifications yet</h3>
          <p>
            You'll see notifications about your adoption applications, favorite pets, and more here.
          </p>
        </EmptyState>
      ) : (
        notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            $isRead={isNotificationRead(notification)}
            onClick={() =>
              handleNotificationClick(notification.id, isNotificationRead(notification))
            }
          >
            <NotificationContent>
              <div className='title'>{notification.title}</div>
              <div className='message'>{notification.message}</div>
              <div className='timestamp'>{formatTimestamp(notification.createdAt)}</div>
            </NotificationContent>
          </NotificationCard>
        ))
      )}
    </Container>
  );
};
