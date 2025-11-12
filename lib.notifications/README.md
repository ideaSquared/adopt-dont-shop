# @adopt-dont-shop/lib-notifications

Production-ready multi-channel notification system for user alerts and updates

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
import { NotificationsService, NotificationRequest } from '@adopt-dont-shop/lib-notifications';

// Initialize the service
const notificationsService = new NotificationsService({
  debug: true,
});

// Send a notification
const notification: NotificationRequest = {
  userId: 'user123',
  title: 'Pet Application Approved!',
  message: 'Your application for Max the Golden Retriever has been approved.',
  category: 'adoption_update',
  priority: 'high',
  channels: ['in-app', 'email', 'push'],
  actionUrl: '/applications/app123',
};

const result = await notificationsService.sendNotification(notification);
console.log('Notification sent:', result.data.id);
```

## 🔔 Core Features

### Multi-Channel Delivery

- **In-App**: Real-time notifications within the application
- **Email**: Rich HTML email notifications with templates
- **Push**: Mobile and web push notifications
- **SMS**: Text message notifications for urgent alerts

### Notification Management

- **Pagination**: Efficient loading of large notification lists
- **Filtering**: Filter by category, status, priority, and date ranges
- **Read Status**: Track and manage read/unread notifications
- **Bulk Operations**: Mark multiple notifications as read or delete

### User Preferences

- **Channel Control**: Users can enable/disable specific channels
- **Category Filtering**: Granular control over notification types
- **Quiet Hours**: Do Not Disturb periods for each channel
- **Timezone Support**: Respect user timezone preferences

### Template System

- **Dynamic Content**: Variable substitution in templates
- **Multi-Channel**: Templates for email, SMS, and push notifications
- **Preview**: Preview templates with sample data
- **Responsive**: Mobile-friendly email templates

## 📖 API Reference

### Notification Delivery

#### `sendNotification(notification: NotificationRequest)`

Send a single notification to a user.

```typescript
const notification: NotificationRequest = {
  userId: 'user123',
  title: 'New Message',
  message: 'You have a new message from Happy Paws Rescue',
  category: 'message_received',
  priority: 'normal',
  channels: ['in-app', 'push'],
  data: {
    chatId: 'chat456',
    senderId: 'rescue789',
  },
};

const response = await notificationsService.sendNotification(notification);
```

#### `sendBulkNotifications(notification: BulkNotificationRequest)`

Send notifications to multiple users.

```typescript
const bulkNotification: BulkNotificationRequest = {
  userIds: ['user1', 'user2', 'user3'],
  title: 'System Maintenance',
  message: 'Platform will be offline for maintenance tonight',
  category: 'system_alert',
  priority: 'high',
  channels: ['in-app', 'email'],
};

const response = await notificationsService.sendBulkNotifications(bulkNotification);
console.log(`Sent to ${response.data.successful} users`);
```

#### `scheduleNotification(notification: NotificationRequest, scheduledFor: Date)`

Schedule a notification for future delivery.

```typescript
const reminder: NotificationRequest = {
  userId: 'user123',
  title: 'Appointment Reminder',
  message: 'Your meet & greet with Bella is tomorrow at 2 PM',
  category: 'reminder',
  priority: 'normal',
};

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
await notificationsService.scheduleNotification(reminder, tomorrow);
```

### Notification Management

#### `getUserNotifications(userId: string, filters?: NotificationFilters)`

Get paginated notifications for a user with optional filtering.

```typescript
const filters: NotificationFilters = {
  page: 1,
  limit: 20,
  category: 'adoption_update',
  unreadOnly: true,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const response = await notificationsService.getUserNotifications('user123', filters);
const notifications = response.data;
const pagination = response.pagination;
```

#### `markAsRead(notificationIds: string[])`

Mark specific notifications as read.

```typescript
await notificationsService.markAsRead(['notif1', 'notif2', 'notif3']);
```

#### `markAllAsRead(userId: string)`

Mark all notifications as read for a user.

```typescript
const result = await notificationsService.markAllAsRead('user123');
console.log(`Marked ${result.data.updated} notifications as read`);
```

#### `deleteNotification(notificationId: string)`

Delete a notification.

```typescript
await notificationsService.deleteNotification('notif123');
```

### Preference Management

#### `getUserPreferences(userId: string)`

Get user notification preferences.

```typescript
const preferences = await notificationsService.getUserPreferences('user123');
console.log('Email enabled:', preferences.data.channels.email.enabled);
```

#### `updatePreferences(userId: string, preferences: Partial<NotificationPreferences>)`

Update user notification preferences.

```typescript
const updates = {
  channels: {
    email: {
      enabled: true,
      categories: ['adoption_update', 'application_status'],
      quietHours: {
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York',
      },
    },
  },
};

await notificationsService.updatePreferences('user123', updates);
```

#### `setDoNotDisturb(userId: string, startTime: string, endTime: string)`

Set do not disturb period for a user.

```typescript
// Quiet hours from 10 PM to 8 AM
await notificationsService.setDoNotDisturb('user123', '22:00', '08:00');
```

### Template Operations

#### `getTemplates()`

Get all available notification templates.

```typescript
const templates = await notificationsService.getTemplates();
const adoptionTemplate = templates.data.find((t) => t.category === 'adoption_update');
```

#### `processTemplate(templateId: string, variables: Record<string, unknown>)`

Process a template with variables.

```typescript
const processed = await notificationsService.processTemplate('adoption_approved', {
  userName: 'John',
  petName: 'Max',
  rescueName: 'Happy Paws Rescue',
  meetDate: '2024-01-15',
});

console.log('Title:', processed.data.title);
console.log('Message:', processed.data.message);
```

#### `previewTemplate(templateId: string, sampleData: Record<string, unknown>)`

Preview a template with sample data.

```typescript
const preview = await notificationsService.previewTemplate('welcome_email', {
  userName: 'Jane Doe',
  platform: "Adopt Don't Shop",
});

// Includes rendered HTML for email preview
console.log('HTML:', preview.data.html);
```

### Analytics

#### `getStats(userId?: string)`

Get notification statistics.

```typescript
// Platform-wide stats
const globalStats = await notificationsService.getStats();

// User-specific stats
const userStats = await notificationsService.getStats('user123');
console.log('Delivery rate:', userStats.data.deliveryRate);
```

#### `getUnreadCount(userId: string)`

Get unread notification count for a user.

```typescript
const count = await notificationsService.getUnreadCount('user123');
console.log(`${count.data.count} unread notifications`);
```

## 🎯 Notification Categories

| Category             | Description                     | Typical Channels    |
| -------------------- | ------------------------------- | ------------------- |
| `adoption_update`    | Pet adoption status changes     | in-app, email, push |
| `message_received`   | New chat messages               | in-app, push        |
| `application_status` | Application processing updates  | in-app, email       |
| `system_alert`       | Platform announcements          | in-app, email       |
| `reminder`           | Upcoming appointments/deadlines | in-app, push, sms   |
| `welcome`            | New user onboarding             | email               |
| `security`           | Account security alerts         | email, sms          |

## 🎨 Priority Levels

| Priority | Description             | Behavior                                       |
| -------- | ----------------------- | ---------------------------------------------- |
| `low`    | Non-urgent information  | Standard delivery, respects quiet hours        |
| `normal` | Regular updates         | Standard delivery, respects quiet hours        |
| `high`   | Important notifications | Faster delivery, may override some quiet hours |
| `urgent` | Critical alerts         | Immediate delivery, overrides all quiet hours  |

## 🔧 Configuration

### NotificationsServiceConfig

| Property  | Type                     | Default                                  | Description                 |
| --------- | ------------------------ | ---------------------------------------- | --------------------------- |
| `apiUrl`  | `string`                 | `process.env.VITE_API_URL`               | Base API URL                |
| `debug`   | `boolean`                | `process.env.NODE_ENV === 'development'` | Enable debug logging        |
| `headers` | `Record<string, string>` | `{}`                                     | Custom headers for requests |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📖 API Reference

### NotificationsService

#### Constructor

```typescript
new NotificationsService(config?: NotificationsServiceConfig)
```

#### Methods

##### `exampleMethod(data, options)`

Example method that demonstrates the library's capabilities.

```typescript
await service.exampleMethod(
  { key: 'value' },
  {
    timeout: 5000,
    useCache: true,
    metadata: { requestId: 'abc123' },
  }
);
```

**Parameters:**

- `data` (Record<string, unknown>): Input data
- `options` (NotificationsServiceOptions): Operation options

**Returns:** `Promise<BaseResponse>`

##### `updateConfig(config)`

Update the service configuration.

```typescript
service.updateConfig({ debug: true, apiUrl: 'https://new-api.com' });
```

##### `getConfig()`

Get current configuration.

```typescript
const config = service.getConfig();
```

##### `clearCache()`

Clear the internal cache.

```typescript
service.clearCache();
```

##### `healthCheck()`

Check service health.

```typescript
const isHealthy = await service.healthCheck();
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

1. **Add to package.json:**

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-notifications": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/index.ts
export { notificationsService } from '@adopt-dont-shop/lib-notifications';

// In your component
import { notificationsService } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await notificationsService.exampleMethod({
          component: 'MyComponent'
        });
        setData(result.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  return <div>{/* Your JSX */}</div>;
}
```

### Node.js Backend (service.backend)

1. **Add to package.json:**

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-notifications": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/notifications.service.ts
import { NotificationsService } from '@adopt-dont-shop/lib-notifications';

export const notificationsService = new NotificationsService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { notificationsService } from '../services/notifications.service';

app.get('/api/notifications/example', async (req, res) => {
  try {
    const result = await notificationsService.exampleMethod(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🐳 Docker Integration

### Development with Docker Compose

1. **Build the library:**

```bash
# From workspace root
docker-compose -f docker-compose.lib.yml up lib-notifications
```

2. **Run tests:**

```bash
docker-compose -f docker-compose.lib.yml run lib-notifications-test
```

### Using in App Containers

Add to your app's Dockerfile:

```dockerfile
# Copy shared libraries
COPY lib.notifications /workspace/lib.notifications

# Install dependencies
RUN npm install @adopt-dont-shop/lib-notifications@workspace:*
```

### Multi-stage Build for Production

```dockerfile
# In your app's Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared library
COPY lib.notifications ./lib.notifications

# Copy app package files
COPY app.client/package*.json ./app.client/

# Install dependencies
RUN cd lib.notifications && npm ci && npm run build
RUN cd app.client && npm ci

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app ./

# Copy app source
COPY app.client ./app.client

# Build app
RUN cd app.client && npm run build
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Structure

```
src/
├── services/
│   ├── notifications-service.ts
│   └── __tests__/
│       └── notifications-service.test.ts
└── types/
    └── index.ts
```

## 🏗️ Development

### Build the Library

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Code Quality

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## 📁 Project Structure

```
lib.notifications/
├── src/
│   ├── services/
│   │   ├── notifications-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── notifications-service.test.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   └── index.ts                      # Main entry point
├── dist/                             # Built output (generated)
├── docker-compose.lib.yml           # Docker compose for development
├── Dockerfile                       # Multi-stage Docker build
├── jest.config.js                   # Jest test configuration
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript configuration
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc.json                 # Prettier configuration
└── README.md                        # This file
```

## 🔗 Integration Examples

### With Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { notificationsService } from '@adopt-dont-shop/lib-notifications';

// Configure with shared dependencies
notificationsService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { notificationsService, ErrorResponse } from '@adopt-dont-shop/lib-notifications';

try {
  const result = await notificationsService.exampleMethod(data);
  // Handle success
} catch (error) {
  const errorResponse = error as ErrorResponse;
  console.error('Error:', errorResponse.error);
  console.error('Code:', errorResponse.code);
  console.error('Details:', errorResponse.details);
}
```

## 🚀 Deployment

### NPM Package (if publishing externally)

```bash
# Build and test
npm run build
npm run test

# Publish
npm publish
```

### Workspace Integration

The library is already integrated into the workspace. Apps can import it using:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-notifications": "workspace:*"
  }
}
```

## 🤝 Contributing

1. Make changes to the library
2. Add/update tests
3. Run `npm run build` to ensure it builds correctly
4. Run `npm test` to ensure tests pass
5. Update documentation as needed

## 📄 License

MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the library is built: `npm run build`
   - Check workspace dependencies are installed: `npm install`

2. **Type errors**
   - Run type checking: `npm run type-check`
   - Ensure TypeScript version compatibility

3. **Build failures**
   - Clean and rebuild: `npm run clean && npm run build`
   - Check for circular dependencies

### Debug Mode

Enable debug logging:

```typescript
notificationsService.updateConfig({ debug: true });
```

Or set environment variable:

```bash
NODE_ENV=development
```
