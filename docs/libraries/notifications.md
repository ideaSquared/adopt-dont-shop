# @adopt-dont-shop/lib-notifications

Multi-channel notification system with real-time delivery, user preferences, and comprehensive template management

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-notifications

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-notifications": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { NotificationsService, NotificationsServiceConfig } from '@adopt-dont-shop/lib-notifications';

// Using the singleton instance
import { notificationsService } from '@adopt-dont-shop/lib-notifications';

// Send a single notification
await notificationsService.sendNotification({
  userId: 'user_123',
  type: 'adoption_update',
  title: 'Application Update',
  message: 'Your adoption application has been approved!',
  channels: ['in_app', 'email', 'push'],
  metadata: {
    petId: 'pet_456',
    applicationId: 'app_789'
  }
});

// Send bulk notifications
await notificationsService.sendBulkNotifications([
  {
    userId: 'user_123',
    type: 'weekly_digest',
    title: 'New Pets This Week',
    message: 'Check out 5 new pets in your area!',
    channels: ['email']
  },
  // ... more notifications
]);
```

## 🔧 Configuration

### NotificationsServiceConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | `string` | `process.env.VITE_API_URL` | Base API URL |
| `debug` | `boolean` | `process.env.NODE_ENV === 'development'` | Enable debug logging |
| `defaultChannels` | `string[]` | `['in_app']` | Default delivery channels |
| `retryAttempts` | `number` | `3` | Failed delivery retry attempts |
| `batchSize` | `number` | `100` | Bulk notification batch size |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Notification Providers
VITE_FIREBASE_CONFIG=your-firebase-config
VITE_SENDGRID_API_KEY=your-sendgrid-key
VITE_TWILIO_CONFIG=your-twilio-config

# Development
NODE_ENV=development
```

## 📖 API Reference

### NotificationsService

#### Core Delivery Methods

##### `sendNotification(notificationData, options?)`

Send a single notification across specified channels.

```typescript
await notificationsService.sendNotification({
  userId: 'user_123',
  type: 'adoption_approved',
  title: 'Adoption Approved! 🎉',
  message: 'Congratulations! Your adoption application for Buddy has been approved.',
  channels: ['in_app', 'email', 'push'],
  priority: 'high',
  metadata: {
    petId: 'pet_456',
    petName: 'Buddy',
    rescueId: 'rescue_789',
    applicationId: 'app_101'
  },
  actionUrl: '/applications/app_101',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
});
```

##### `sendBulkNotifications(notifications, options?)`

Send multiple notifications efficiently with batching.

```typescript
const notifications = [
  {
    userId: 'user_123',
    type: 'new_pets_weekly',
    title: 'New Pets This Week',
    message: '5 new dogs and 3 new cats are available for adoption!',
    channels: ['email']
  },
  {
    userId: 'user_456',
    type: 'application_reminder',
    title: 'Complete Your Application',
    message: 'Don\'t forget to complete your adoption application for Luna.',
    channels: ['in_app', 'push']
  }
];

await notificationsService.sendBulkNotifications(notifications, {
  batchSize: 50,
  delayBetweenBatches: 1000 // 1 second delay
});
```

##### `scheduleNotification(notificationData, scheduledFor, options?)`

Schedule notifications for future delivery.

```typescript
await notificationsService.scheduleNotification({
  userId: 'user_123',
  type: 'appointment_reminder',
  title: 'Meet & Greet Tomorrow',
  message: 'Don\'t forget your meet & greet with Bella tomorrow at 2 PM!',
  channels: ['in_app', 'push', 'sms']
}, new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours from now
```

#### Notification Management

##### `getUserNotifications(userId, filters?, options?)`

Retrieve user notifications with filtering and pagination.

```typescript
const notifications = await notificationsService.getUserNotifications('user_123', {
  unreadOnly: true,
  type: 'adoption_update',
  limit: 20,
  offset: 0
});
```

##### `markAsRead(notificationIds, userId, options?)`

Mark notifications as read.

```typescript
await notificationsService.markAsRead(['notif_1', 'notif_2'], 'user_123');
```

##### `markAllAsRead(userId, options?)`

Mark all notifications as read for a user.

```typescript
await notificationsService.markAllAsRead('user_123');
```

##### `deleteNotification(notificationId, userId, options?)`

Delete a specific notification.

```typescript
await notificationsService.deleteNotification('notif_123', 'user_123');
```

#### Preference Management

##### `getUserPreferences(userId, options?)`

Get user notification preferences.

```typescript
const preferences = await notificationsService.getUserPreferences('user_123');
```

##### `updateUserPreferences(userId, preferences, options?)`

Update user notification preferences.

```typescript
await notificationsService.updateUserPreferences('user_123', {
  channels: {
    email: true,
    push: true,
    sms: false,
    in_app: true
  },
  types: {
    adoption_updates: true,
    new_pets: false,
    weekly_digest: true,
    marketing: false
  },
  quiet_hours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'America/New_York'
  }
});
```

##### `setDoNotDisturb(userId, startTime, endTime, options?)`

Set do not disturb period for a user.

```typescript
await notificationsService.setDoNotDisturb('user_123', '22:00', '08:00', {
  timezone: 'America/New_York',
  applyToChannels: ['push', 'sms']
});
```

#### Analytics & Insights

##### `getUnreadCount(userId, options?)`

Get unread notification count.

```typescript
const unreadCount = await notificationsService.getUnreadCount('user_123');
```

##### `getDeliveryStats(filters?, options?)`

Get notification delivery statistics.

```typescript
const stats = await notificationsService.getDeliveryStats({
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  },
  type: 'adoption_update'
});
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Notification Context Provider
import { createContext, useContext, useEffect, useState } from 'react';
import { NotificationsService } from '@adopt-dont-shop/lib-notifications';

const NotificationsContext = createContext<{
  service: NotificationsService;
  unreadCount: number;
  notifications: Notification[];
}>({} as any);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new NotificationsService({
    debug: process.env.NODE_ENV === 'development'
  }));
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Load initial notifications
    const loadNotifications = async () => {
      const userNotifications = await service.getUserNotifications(userId, {
        limit: 50
      });
      setNotifications(userNotifications.data);
      
      const count = await service.getUnreadCount(userId);
      setUnreadCount(count);
    };

    loadNotifications();
  }, []);

  return (
    <NotificationsContext.Provider value={{ service, unreadCount, notifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);

// In components
function NotificationBell() {
  const { unreadCount, service } = useNotifications();

  return (
    <div className="notification-bell">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/notifications.service.ts
import { NotificationsService } from '@adopt-dont-shop/lib-notifications';

export const notificationsService = new NotificationsService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { notificationsService } from '../services/notifications.service';

// Send notification when adoption application is approved
app.post('/api/applications/:id/approve', async (req, res) => {
  // ... business logic ...

  // Send notification
  await notificationsService.sendNotification({
    userId: application.userId,
    type: 'adoption_approved',
    title: 'Application Approved!',
    message: `Your adoption application for ${pet.name} has been approved!`,
    channels: ['in_app', 'email', 'push'],
    metadata: {
      petId: pet.id,
      applicationId: application.id,
      rescueId: rescue.id
    }
  });

  res.json({ success: true });
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Single notification delivery
- ✅ Bulk notification processing
- ✅ Scheduled notifications
- ✅ User preference management
- ✅ Do not disturb functionality
- ✅ Notification retrieval and filtering
- ✅ Read status management
- ✅ Analytics and reporting
- ✅ Error handling and retries

Run tests:
```bash
npm run test:lib-notifications
```

## 🚀 Key Features

### Multi-Channel Delivery
- **In-App Notifications**: Real-time notifications within the application
- **Email Notifications**: Rich HTML email templates with personalization
- **Push Notifications**: Mobile and web push via Firebase/FCM
- **SMS Notifications**: Text message delivery via Twilio

### Advanced Features
- **Smart Batching**: Efficient bulk delivery with rate limiting
- **Template Management**: Dynamic templates with variable substitution
- **Delivery Optimization**: Channel-specific optimization and fallbacks
- **Real-time Updates**: WebSocket integration for instant delivery

### User Experience
- **Preference Management**: Granular user control over notifications
- **Do Not Disturb**: Quiet hours and temporary muting
- **Read Receipts**: Track notification engagement
- **Action Buttons**: Interactive notifications with deep links

### Enterprise Features
- **Analytics Dashboard**: Delivery metrics and engagement tracking
- **A/B Testing**: Template and timing optimization
- **Compliance**: GDPR, CAN-SPAM, and TCPA compliance
- **High Availability**: Failover and redundancy support

## 🔧 Troubleshooting

### Common Issues

**Notifications not delivering**:
- Check user preferences and do not disturb settings
- Verify API keys and provider configuration
- Check delivery logs for error details

**High delivery latency**:
- Review batch size and processing limits
- Check provider rate limits
- Monitor queue depth and processing times

### Debug Mode

```typescript
const notifications = new NotificationsService({
  debug: true // Enables detailed delivery logging
});
```

This library provides enterprise-grade notification capabilities with comprehensive delivery options, user preference management, and detailed analytics for optimal user engagement.
