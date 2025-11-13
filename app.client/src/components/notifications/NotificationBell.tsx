import { useNotifications } from '@/contexts/NotificationContext';
import notificationService, { type Notification } from '@/services/notificationService';
import React, { useEffect, useRef, useState } from 'react';
import { MdNotifications } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
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
  overflow: visible; /* Ensure badge can extend outside */

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
    css`
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
  top: -10px;
  right: -10px;
  background: linear-gradient(45deg, #ff4444, #ff6b6b);
  color: white;
  border-radius: 50%;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 3px solid white;
  box-shadow: 0 4px 16px rgba(255, 68, 68, 0.5);
  animation: ${pulseGlow} 1.5s ease-in-out infinite;
  z-index: 20;
  pointer-events: none;

  ${({ $count }) =>
    $count > 99 &&
    `
    min-width: 28px;
    height: 24px;
    border-radius: 12px;
    font-size: 0.7rem;
  `}

  /* Enhanced visibility with glow */
  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    background: linear-gradient(45deg, #ff4444, #ff6b6b);
    z-index: -1;
    filter: blur(6px);
    opacity: 0.7;
  }

  /* Ensure it shows up on different backgrounds */
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
`;

const DropdownContainer = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 16px);
  right: 0;
  z-index: 1001;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) =>
    $isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top right;

  /* Ensure dropdown doesn't go off-screen */
  @media (min-width: 769px) {
    right: 0;
    max-width: 90vw;

    /* If dropdown would go off left edge, align to left instead */
    &::before {
      content: '';
      position: absolute;
      top: -8px;
      right: 24px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid ${props => props.theme.background.primary};
      filter: drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.1));
    }
  }

  @media (max-width: 768px) {
    position: fixed;
    top: 70px;
    left: 1rem;
    right: 1rem;
    width: auto;
    transform: ${({ $isOpen }) =>
      $isOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)'};
    transform-origin: top center;

    &::before {
      display: none;
    }
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
  padding: 1.5rem;
  width: 420px;
  max-width: 90vw;
  margin-bottom: 1rem;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);

  @media (max-width: 768px) {
    width: calc(100vw - 2rem);
    padding: 1.25rem;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0;
  }
`;

const ViewAllButton = styled.button`
  background: ${props => props.theme.colors.primary[500]};
  border: none;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[600]};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const QuickNotificationItem = styled.div<{ $isRead: boolean }>`
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid ${props => props.theme.border.color.primary};
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${props =>
    props.$isRead ? props.theme.background.primary : props.theme.background.secondary};
  position: relative;

  /* Visual indicator for unread notifications */
  ${props =>
    !props.$isRead &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 60%;
      background: linear-gradient(45deg, #ff4444, #ff6b6b);
      border-radius: 0 2px 2px 0;
    }
    
    border-left: 3px solid transparent;
    padding-left: 1.25rem;
  `}

  &:hover {
    background: ${props => props.theme.background.secondary};
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border-color: ${props => props.theme.colors.primary[300]};
  }

  &:active {
    transform: translateY(-1px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const QuickNotificationTitle = styled.div<{ $isRead: boolean }>`
  font-size: 0.925rem;
  font-weight: ${props => (props.$isRead ? 'normal' : '600')};
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const QuickNotificationMessage = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.text.secondary};
  margin-bottom: 0.5rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
      <NotificationContainer ref={containerRef} className={className}>
        <NotificationButton
          onClick={toggleDropdown}
          $hasUnread={unreadCount > 0}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          title={`${unreadCount} unread notifications`}
        >
          <MdNotifications className='notification-icon' />
          {unreadCount > 0 && (
            <NotificationBadge $count={unreadCount} data-testid='notification-badge'>
              {formatCount(unreadCount)}
            </NotificationBadge>
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
              recentNotifications.slice(0, 4).map(notification => (
                <QuickNotificationItem
                  key={notification.notification_id}
                  $isRead={!!notification.read_at}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <QuickNotificationTitle $isRead={!!notification.read_at}>
                    {notification.title}
                  </QuickNotificationTitle>
                  <QuickNotificationMessage>{notification.message}</QuickNotificationMessage>
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
