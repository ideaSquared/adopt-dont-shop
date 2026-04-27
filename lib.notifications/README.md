# @adopt-dont-shop/lib.notifications

Multi-channel notification client — send, schedule, list, and acknowledge notifications across email, push, in-app, and SMS channels.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.notifications": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`NotificationsService`** — class client
- **Types** — `NotificationsServiceConfig`, `NotificationsServiceOptions`, plus event / preference / template types re-exported from `./types`.

### Key methods

Sending:

- `sendNotification(...)`, `sendBulkNotifications(...)`, `scheduleNotification(...)`

Listing:

- `getUserNotifications(userId, options?)`, `getNotification(notificationId)`

Acknowledging:

- `markAsRead(notificationIds)`, `markAllAsRead(userId)`
- `deleteNotification(...)`

Preferences:

- `getUserPreferences(userId)`, `updatePreferences(...)`
- `setDoNotDisturb(...)`

Templates:

- `getTemplates()`, `processTemplate(...)`

Config / lifecycle:

- `getConfig()`, `updateConfig(updates)`

## Quick start

```typescript
import { NotificationsService } from '@adopt-dont-shop/lib.notifications';

const notifications = new NotificationsService({ apiUrl: import.meta.env.VITE_API_BASE_URL });

await notifications.sendNotification({
  userId,
  channel: 'email',
  templateId: 'adoption_approved',
  data: { petName: 'Biscuit' },
});
```

## Scripts (from `lib.notifications/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # jest
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
