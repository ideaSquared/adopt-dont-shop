import { useNotifications } from '@/contexts/NotificationContext';
import notificationService, { type Notification } from '@/services/notificationService';
import React, { useEffect, useRef, useState } from 'react';
import { MdNotifications } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import * as styles from './NotificationBell.css';
import { NotificationCenterComponent } from './NotificationCenter';

interface NotificationBellProps {
  className?: string;
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

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullCenter, setShowFullCenter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Use notification context instead of local state
  const {
    unreadCount,
    recentNotifications,
    isLoading,
    markAsRead: contextMarkAsRead,
    refreshUnreadCount,
  } = useNotifications();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowFullCenter(false);
      }
    };

    if (isOpen || showFullCenter) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, showFullCenter]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);

    // Request notification permission if not already granted
    if (Notification.permission === 'default') {
      notificationService.requestPushPermission();
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if not already read
      if (!notification.read_at) {
        await contextMarkAsRead(notification.notification_id);

        // Force refresh the unread count after a successful mark as read
        // This ensures the count is accurate even if optimistic updates fail
        setTimeout(async () => {
          await refreshUnreadCount();
        }, 100);
      }

      // Navigate based on notification data
      if (notification.data?.action_url) {
        const actionUrl = notification.data.action_url as string;
        if (actionUrl.startsWith('http')) {
          window.open(actionUrl, '_blank');
        } else {
          navigate(actionUrl);
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  };

  const openFullCenter = () => {
    setIsOpen(false);
    setShowFullCenter(true);
  };

  const closeFullCenter = () => {
    setShowFullCenter(false);
  };

  const formatCount = (count: number): string => {
    if (count > 99) {
      return '99+';
    }
    return count.toString();
  };

  return (
    <>
      <div
        className={`${styles.notificationContainer}${className ? ` ${className}` : ''}`}
        ref={containerRef}
      >
        <button
          className={styles.notificationButton({ hasUnread: unreadCount > 0 })}
          onClick={toggleDropdown}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          title={`${unreadCount} unread notifications`}
        >
          <MdNotifications className={styles.notificationIcon} />
          {unreadCount > 0 && (
            <div className={styles.notificationBadge} data-testid='notification-badge'>
              {formatCount(unreadCount)}
            </div>
          )}
        </button>

        <div className={styles.dropdownContainer({ isOpen })}>
          <div className={styles.quickPreview}>
            <div className={styles.previewHeader}>
              <h3>Recent Notifications</h3>
              <button className={styles.viewAllButton} onClick={openFullCenter}>
                View All
              </button>
            </div>

            {isLoading ? (
              <div className={styles.emptyState}>Loading...</div>
            ) : recentNotifications.length === 0 ? (
              <div className={styles.emptyState}>No notifications yet</div>
            ) : (
              recentNotifications.slice(0, 4).map(notification => (
                <div
                  className={styles.quickNotificationItem({ isRead: !!notification.read_at })}
                  key={notification.notification_id}
                  onClick={() => handleNotificationClick(notification)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notification);
                  }}
                >
                  <div
                    className={styles.quickNotificationTitle({ isRead: !!notification.read_at })}
                  >
                    {notification.title}
                  </div>
                  <div className={styles.quickNotificationMessage}>{notification.message}</div>
                  <div className={styles.quickNotificationTime}>
                    {formatRelativeTime(notification.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      <div
        className={styles.overlay({ isOpen })}
        onClick={() => setIsOpen(false)}
        role='button'
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        aria-label='Close notifications'
      />

      {/* Full Notification Center Modal */}
      {showFullCenter && (
        <>
          <div
            className={styles.overlay({ isOpen: true })}
            onClick={closeFullCenter}
            role='button'
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Escape') closeFullCenter();
            }}
            aria-label='Close notification center'
          />
          <div
            style={{
              position: 'fixed',
              top: '5vh',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1002,
              maxHeight: '90vh',
              width: '90vw',
              maxWidth: '800px',
              overflow: 'auto',
            }}
          >
            <NotificationCenterComponent onClose={closeFullCenter} />
          </div>
        </>
      )}
    </>
  );
};

export default NotificationBell;
