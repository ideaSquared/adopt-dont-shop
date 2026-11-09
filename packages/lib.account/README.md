# @adopt-dont-shop/lib.account

Shared personal account settings (notifications, security, appearance) for every app.

## Purpose

One settings UI for the signed-in user's own account, used by `app.admin`,
`app.client` and `app.rescue` so the three apps don't each grow their own
version. It owns the notification preferences form (and the TanStack Query
hooks and Zod-validated service behind it) and composes it with the existing
`TwoFactorSettings` (lib.auth) and `ThemeToggle` (lib.components) into a
tabbed `AccountSettings` component. App-specific settings, such as the
adopter's privacy and pet preferences in `app.client`, are passed in as extra
tabs rather than living here.

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
libraries sit. Depends on `lib.api` (requests), `lib.auth` (two-factor
settings) and `lib.components` (form controls, tabs, theme). Backs onto the
gateway's `GET` / `PUT /api/v1/notifications/preferences`
(`services/gateway/src/routes/notifications.ts`), which reads and writes
`notifications.user_notification_prefs`.

## Scripts

```bash
pnpm dev          # tsc --watch
pnpm build        # tsc → dist/
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts). Consumers add the
dependency and import from the package root:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.account": "workspace:*"
  }
}
```

```tsx
import { AccountSettings } from '@adopt-dont-shop/lib.account';

const [tab, setTab] = useState('notifications');

<AccountSettings
  value={tab}
  onChange={setTab}
  extraTabs={[{ id: 'privacy', label: 'Privacy', content: <PrivacySettings /> }]}
/>;
```

- **Components**: `AccountSettings` (controlled tabs: Notifications, Security,
  Appearance, then any `extraTabs`; an unknown `value` shows Notifications, so
  stale links still land somewhere), `NotificationPreferencesForm` (channels,
  categories, email digest, quiet hours and timezone).
- **Hooks**: `useNotificationPreferences`, `useUpdateNotificationPreferences`,
  `NOTIFICATION_PREFERENCES_QUERY_KEY`.
- **Service functions**: `fetchNotificationPreferences`,
  `updateNotificationPreferences`, `DIGEST_FREQUENCIES`.

`AccountSettings` needs the app's `AuthProvider`, `ThemeProvider` and
`QueryClientProvider` above it; every app already mounts all three.

## Environment variables consumed

None. Requests go through the shared `apiService` from `lib.api`.

## Testing notes

Vitest + React Testing Library. Tests mock the service module (not
`apiService`) for component and hook behaviour, and mock `apiService` only in
the service test, which pins the gateway's response quirks: proto JSON omits
`false` booleans, `digestFrequency` arrives as the proto enum name, and quiet
hours arrive as `HH:MM:SS`. `src/test-utils/setup-tests.ts` polyfills the
pointer-capture APIs Radix Select needs under jsdom. Consumers testing a page
that renders `AccountSettings` should mock `@adopt-dont-shop/lib.account`.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
