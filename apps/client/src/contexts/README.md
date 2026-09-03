# Client app contexts

_Reference for the React context providers owned by `app.client` (`src/contexts/`): what each owns,
where it is mounted, and its hook. The shared provider spine is described in
[docs/frontend/app-shell.md](../../../../docs/frontend/app-shell.md)._

## Contexts

| Context                             | Owns                                                                                   | Mounted in | Hook               |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ---------- | ------------------ |
| `StatsigContext` (`StatsigWrapper`) | Wraps `@statsig/react-bindings` for feature flags                                      | `main.tsx` | —                  |
| `AnalyticsContext`                  | Forwards UI events into `lib.analytics`                                                | `App.tsx`  | `useAnalytics`     |
| `NotificationsContext`              | Real-time notifications, unread counts, browser-notification opt-in                    | `App.tsx`  | `useNotifications` |
| `ChatContext`                       | Chat connection state from `lib.chat` + outbound message queueing via `offlineManager` | `App.tsx`  | `useChat`          |
| `FavoritesContext`                  | Favorited pets and optimistic favorite/unfavorite                                      | `App.tsx`  | `useFavorites`     |
| `MatchAcknowledgementContext`       | Queues "it's a match" acknowledgements for the match modal                             | `App.tsx`  | (provider only)    |

Auth (`AuthProvider` / `useAuth`) and permissions (`PermissionsProvider` / `useHasPermission`) come
from `@adopt-dont-shop/lib.auth`, not this directory. `base/BaseContext.tsx` holds the
`createAppContext` helper these providers build on.

## Provider nesting

`AuthProvider`, `StatsigWrapper`, and `ThemeProvider` wrap the app in `main.tsx`; `App.tsx` then
composes the app-owned providers in this exact order (`src/App.tsx`):

```tsx
<PermissionsProvider service={permissionsService}>
  {' '}
  {/* from lib.auth; service from @/services/libraryServices */}
  <AnalyticsProvider>
    <NotificationsProvider userId={user?.userId}>
      <ChatProvider>
        <FavoritesProvider>
          <MatchAcknowledgementProvider>{/* routes */}</MatchAcknowledgementProvider>
        </FavoritesProvider>
      </ChatProvider>
    </NotificationsProvider>
  </AnalyticsProvider>
</PermissionsProvider>
```

## Notifications context

The most-used context. Real-time notifications with context-based state so unread counts stay
consistent across components.

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

It handles initial load, real-time subscription (WebSocket/polling), optimistic mark-as-read with
error fallback, and native browser notifications when the user has granted permission.
