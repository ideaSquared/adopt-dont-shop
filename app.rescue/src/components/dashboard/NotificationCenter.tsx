import React, { useState } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const NotificationCenter: React.FC = () => {
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: 'New Application',
      message: 'New adoption application received for Buddy',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: 'Successful Adoption',
      message: 'Max has been successfully adopted!',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      type: 'warning',
      title: 'Medical Appointment',
      message: 'Luna has a vet appointment tomorrow at 2 PM',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: '4',
      type: 'info',
      title: 'New Volunteer',
      message: 'Sarah has joined as a new volunteer',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>
          Recent Notifications
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </h3>
      </div>

      <div className="notification-list">
        {notifications.slice(0, 4).map(notification => (
          <div
            key={notification.id}
            className={`notification-item ${notification.read ? 'read' : 'unread'}`}
          >
            <div className="notification-icon">{getNotificationIcon(notification.type)}</div>
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">{formatTimestamp(notification.timestamp)}</div>
            </div>
            {!notification.read && <div className="unread-indicator" />}
          </div>
        ))}
      </div>

      <div className="notification-footer">
        <button className="view-all-btn">View All Notifications</button>
      </div>
    </div>
  );
};

export default NotificationCenter;
