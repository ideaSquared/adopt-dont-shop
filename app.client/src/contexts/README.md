# Notification System

## Overview

The notification system provides real-time notifications with context-based state management for consistent data across the application.

## Usage

### Using the Context Hook (Recommended)

```tsx
import { useNotifications } from '@/contexts/NotificationsContext';

function MyComponent() {
  const { unreadCount, recentNotifications, markAsRead, markAllAsRead, isLoading } =
    useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {recentNotifications.map(notification => (
        <div key={notification.notification_id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          {!notification.read_at && (
            <button onClick={() => markAsRead(notification.notification_id)}>Mark as read</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Provider Setup

The `NotificationsProvider` is already set up in `App.tsx`. `AuthProvider` wraps the app in `main.tsx`, then `App` composes the rest:

```tsx
<PermissionsProvider>
  <AnalyticsProvider>
    <NotificationsProvider userId={user?.userId}>
      <ChatProvider>
        <FavoritesProvider>{/* Your app content */}</FavoritesProvider>
      </ChatProvider>
    </NotificationsProvider>
  </AnalyticsProvider>
</PermissionsProvider>
```

## Features

### ✅ Real-time Updates

- WebSocket/polling integration
- Automatic state synchronization
- Browser notification support

### ✅ Optimistic Updates

- Instant UI feedback when marking as read
- Automatic fallback on errors

### ✅ Centralized State

- Single source of truth for notification data
- Consistent across all components
- No duplicate API calls

### ✅ Enhanced UX

- Visual indicators for unread notifications
- Smooth animations and transitions
- Responsive design

## Components

### NotificationBell

- Shows unread count badge
- Quick preview dropdown
- Integrates with full notification center

### NotificationCenter (via context)

- Full notification management
- Filtering and sorting
- Bulk operations

## API Integration

The context automatically handles:

- Initial data loading
- Real-time subscriptions
- Error handling and retries
- Optimistic updates

## Browser Notifications

Automatically requests permission and shows native browser notifications for new notifications when the user has granted permission.
