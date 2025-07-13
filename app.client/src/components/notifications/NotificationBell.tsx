import notificationService, { type Notification } from '@/services/notificationService';
import React, { useEffect, useRef, useState } from 'react';
import { MdNotifications } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { NotificationCenterComponent } from './NotificationCenter';

const bellRing = keyframes`
  0%, 50%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
`;

const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 5px rgba(255, 64, 129, 0.3);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 15px rgba(255, 64, 129, 0.6);
    transform: scale(1.05);
  }
`;

const NotificationContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const NotificationButton = styled.button<{ $hasUnread: boolean }>`
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  ${({ $hasUnread }) =>
    $hasUnread &&
    `
    animation: ${pulseGlow} 2s ease-in-out infinite;
    
    .notification-icon {
      animation: ${bellRing} 2s ease-in-out infinite;
    }
  `}

  @media (max-width: 768px) {
    padding: 0.6rem;
    font-size: 1.1rem;
  }
`;

const NotificationBadge = styled.div<{ $count: number }>`
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(45deg, #ff4444, #ff6b6b);
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: ${pulseGlow} 1.5s ease-in-out infinite;

  ${({ $count }) =>
    $count > 99 &&
    `
    min-width: 24px;
    height: 20px;
    border-radius: 10px;
    font-size: 0.7rem;
  `}
`;

const DropdownContainer = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 1001;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) =>
    $isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  transition: all 0.2s ease;
  transform-origin: top right;

  @media (max-width: 768px) {
    position: fixed;
    top: 60px;
    left: 1rem;
    right: 1rem;
    width: auto;
    transform: ${({ $isOpen }) =>
      $isOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)'};
    transform-origin: top center;
  }
`;

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  z-index: 1000;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.2s ease;
  backdrop-filter: blur(2px);
`;

const QuickPreview = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  padding: 1rem;
  max-width: 350px;
  margin-bottom: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h3 {
    font-size: 1rem;
    color: ${props => props.theme.text.primary};
    margin: 0;
  }
`;

const ViewAllButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary[500]};
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: ${props => props.theme.colors.primary[600]};
  }
`;

const QuickNotificationItem = styled.div<{ $isRead: boolean }>`
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.border.color.primary};
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props =>
    props.$isRead ? props.theme.background.primary : props.theme.background.secondary};

  &:hover {
    background: ${props => props.theme.background.secondary};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const QuickNotificationTitle = styled.div<{ $isRead: boolean }>`
  font-size: 0.875rem;
  font-weight: ${props => (props.$isRead ? 'normal' : '600')};
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.25rem;
  line-height: 1.3;
`;

const QuickNotificationTime = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 1.5rem;
  color: ${props => props.theme.text.secondary};
  font-size: 0.875rem;
`;

interface NotificationBellProps {
  className?: string;
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullCenter, setShowFullCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Load unread count
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);

        // Load recent notifications for preview
        const response = await notificationService.getNotifications({
          limit: 5,
          status: undefined, // Get both read and unread for preview
        });
        setRecentNotifications(response.notifications);
      } catch (error) {
        console.error('Failed to load notification data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Subscribe to unread count changes
    const unsubscribeCount = notificationService.onUnreadCountChange(setUnreadCount);

    // Subscribe to new notifications
    const unsubscribeNew = notificationService.onNewNotification(notification => {
      setRecentNotifications(prev => [notification, ...prev.slice(0, 4)]);

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        notificationService.showBrowserNotification(notification.title, notification.message, {
          icon: '/favicon.ico',
          tag: notification.notification_id,
        });
      }
    });

    // Start polling for updates (fallback)
    const stopPolling = notificationService.startPolling(60000); // Poll every minute

    return () => {
      unsubscribeCount();
      unsubscribeNew();
      stopPolling();
    };
  }, []);

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
        await notificationService.markAsRead(notification.notification_id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setRecentNotifications(prev =>
          prev.map(n =>
            n.notification_id === notification.notification_id
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
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
    if (count > 99) return '99+';
    return count.toString();
  };

  return (
    <>
      <NotificationContainer ref={containerRef} className={className}>
        <NotificationButton
          onClick={toggleDropdown}
          $hasUnread={unreadCount > 0}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          title={`${unreadCount} unread notifications`}
        >
          <MdNotifications className='notification-icon' />
          {unreadCount > 0 && (
            <NotificationBadge $count={unreadCount}>{formatCount(unreadCount)}</NotificationBadge>
          )}
        </NotificationButton>

        <DropdownContainer $isOpen={isOpen}>
          <QuickPreview>
            <PreviewHeader>
              <h3>Recent Notifications</h3>
              <ViewAllButton onClick={openFullCenter}>View All</ViewAllButton>
            </PreviewHeader>

            {isLoading ? (
              <EmptyState>Loading...</EmptyState>
            ) : recentNotifications.length === 0 ? (
              <EmptyState>No notifications yet</EmptyState>
            ) : (
              recentNotifications.map(notification => (
                <QuickNotificationItem
                  key={notification.notification_id}
                  $isRead={!!notification.read_at}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <QuickNotificationTitle $isRead={!!notification.read_at}>
                    {notification.title}
                  </QuickNotificationTitle>
                  <QuickNotificationTime>
                    {formatRelativeTime(notification.created_at)}
                  </QuickNotificationTime>
                </QuickNotificationItem>
              ))
            )}
          </QuickPreview>
        </DropdownContainer>
      </NotificationContainer>

      {/* Overlay for mobile */}
      <Overlay $isOpen={isOpen} onClick={() => setIsOpen(false)} />

      {/* Full Notification Center Modal */}
      {showFullCenter && (
        <>
          <Overlay $isOpen={true} onClick={closeFullCenter} />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1002,
              maxHeight: '90vh',
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
