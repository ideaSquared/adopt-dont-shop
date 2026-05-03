import notificationService, {
  Notification,
  NotificationFilters,
} from '@/services/notificationService';
import { NotificationType, getNotificationTypeLabel } from '@/types/notifications';
import { Button } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as styles from './NotificationCenter.css';

interface NotificationCenterProps {
  onClose?: () => void;
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }
  if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  return date.toLocaleDateString();
};

export const NotificationCenterComponent: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 20,
    status: undefined,
    type: undefined,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const response = await notificationService.getNotifications(filters);
        setNotifications(response.notifications);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [filters]);

  const handleFilterChange = (key: keyof NotificationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.notification_id === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          read_at: new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev =>
        prev.filter(notification => notification.notification_id !== notificationId)
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read_at) {
      handleMarkAsRead(notification.notification_id, {
        stopPropagation: () => {},
      } as React.MouseEvent);
    }

    // Handle navigation based on notification data
    if (notification.data?.action_url) {
      navigate(notification.data.action_url as string);
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className={styles.notificationCenter}>
      <div className={styles.header}>
        <h2>Notifications {unreadCount > 0 && `(${unreadCount} unread)`}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {unreadCount > 0 && (
            <Button variant='secondary' size='sm' onClick={handleMarkAllAsRead}>
              Mark All Read
            </Button>
          )}
          {onClose && (
            <Button variant='secondary' size='sm' onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value=''>All notifications</option>
          <option value='unread'>Unread only</option>
          <option value='read'>Read only</option>
        </select>

        <select
          className={styles.filterSelect}
          value={filters.type || ''}
          onChange={e => handleFilterChange('type', e.target.value)}
        >
          <option value=''>All types</option>
          {(Object.values(NotificationType) as string[]).map(type => (
            <option key={type} value={type}>
              {getNotificationTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.notificationList}>
        {isLoading ? (
          <div className={styles.loadingState}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No notifications</h3>
            <p>You&apos;re all caught up! New notifications will appear here.</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              className={styles.notificationItem({ isRead: !!notification.read_at })}
              key={notification.notification_id}
              onClick={() => handleNotificationClick(notification)}
              role='button'
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleNotificationClick(notification);
                }
              }}
            >
              <div className={styles.notificationHeader}>
                <h3 className={styles.notificationTitle({ isRead: !!notification.read_at })}>
                  {notification.title}
                </h3>
                <span className={styles.notificationTime}>
                  {formatRelativeTime(notification.created_at)}
                </span>
              </div>

              <p className={styles.notificationMessage}>{notification.message}</p>

              <div className={styles.notificationActions}>
                {!notification.read_at && (
                  <button
                    className={styles.actionButtonPrimary}
                    onClick={e => handleMarkAsRead(notification.notification_id, e)}
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  className={styles.actionButtonDanger}
                  onClick={e => handleDeleteNotification(notification.notification_id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className={styles.paginationButtons}>
            <Button
              variant='secondary'
              size='sm'
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant='secondary'
              size='sm'
              disabled={pagination.page >= pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenterComponent;
