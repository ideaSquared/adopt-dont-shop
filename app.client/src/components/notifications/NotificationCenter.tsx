import notificationService, {
  Notification,
  NotificationFilters,
} from '@/services/notificationService';
import { NotificationType, getNotificationTypeLabel } from '@/types/notifications';
import { Button } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const NotificationCenter = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  overflow: hidden;
  max-width: 600px;
  width: 100%;
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    font-size: 1.25rem;
    color: ${props => props.theme.text.primary};
    margin: 0;
  }
`;

const FilterBar = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 6px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
  }
`;

const NotificationList = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const NotificationItem = styled.div<{ $isRead: boolean }>`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};
  background: ${props =>
    props.$isRead ? props.theme.background.primary : props.theme.background.secondary};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.theme.background.secondary};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const NotificationTitle = styled.h3<{ $isRead: boolean }>`
  font-size: 1rem;
  color: ${props => props.theme.text.primary};
  margin: 0;
  font-weight: ${props => (props.$isRead ? 'normal' : '600')};
`;

const NotificationTime = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
  white-space: nowrap;
`;

const NotificationMessage = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
  margin: 0;
  line-height: 1.4;
`;

const NotificationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const ActionButton = styled.button`
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  background: ${props => props.theme.colors.neutral[200]};
  color: ${props => props.theme.text.primary};
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.neutral[300]};
  }

  &.primary {
    background: ${props => props.theme.colors.primary[500]};
    color: white;

    &:hover {
      background: ${props => props.theme.colors.primary[600]};
    }
  }

  &.danger {
    background: ${props => props.theme.colors.semantic.error[500]};
    color: white;

    &:hover {
      background: ${props => props.theme.colors.semantic.error[600]};
    }
  }
`;

const EmptyState = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: ${props => props.theme.text.secondary};

  h3 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    font-size: 0.875rem;
    margin: 0;
  }
`;

const LoadingState = styled.div`
  padding: 2rem 1.5rem;
  text-align: center;
  color: ${props => props.theme.text.secondary};
`;

const Pagination = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};
  display: flex;
  justify-content: space-between;
  align-items: center;

  span {
    font-size: 0.875rem;
    color: ${props => props.theme.text.secondary};
  }
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

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
    <NotificationCenter>
      <Header>
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
      </Header>

      <FilterBar>
        <FilterSelect
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value=''>All notifications</option>
          <option value='unread'>Unread only</option>
          <option value='read'>Read only</option>
        </FilterSelect>

        <FilterSelect
          value={filters.type || ''}
          onChange={e => handleFilterChange('type', e.target.value)}
        >
          <option value=''>All types</option>
          {(Object.values(NotificationType) as string[]).map(type => (
            <option key={type} value={type}>
              {getNotificationTypeLabel(type)}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>

      <NotificationList>
        {isLoading ? (
          <LoadingState>Loading notifications...</LoadingState>
        ) : notifications.length === 0 ? (
          <EmptyState>
            <h3>No notifications</h3>
            <p>You&apos;re all caught up! New notifications will appear here.</p>
          </EmptyState>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.notification_id}
              $isRead={!!notification.read_at}
              onClick={() => handleNotificationClick(notification)}
            >
              <NotificationHeader>
                <NotificationTitle $isRead={!!notification.read_at}>
                  {notification.title}
                </NotificationTitle>
                <NotificationTime>{formatRelativeTime(notification.created_at)}</NotificationTime>
              </NotificationHeader>

              <NotificationMessage>{notification.message}</NotificationMessage>

              <NotificationActions>
                {!notification.read_at && (
                  <ActionButton
                    className='primary'
                    onClick={e => handleMarkAsRead(notification.notification_id, e)}
                  >
                    Mark as Read
                  </ActionButton>
                )}
                <ActionButton
                  className='danger'
                  onClick={e => handleDeleteNotification(notification.notification_id, e)}
                >
                  Delete
                </ActionButton>
              </NotificationActions>
            </NotificationItem>
          ))
        )}
      </NotificationList>

      {pagination.pages > 1 && (
        <Pagination>
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <PaginationButtons>
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
          </PaginationButtons>
        </Pagination>
      )}
    </NotificationCenter>
  );
};

export default NotificationCenterComponent;
