# @adopt-dont-shop/lib.account

Shared personal account settings (notifications, security, appearance, account) for every app.

## Purpose

One settings UI for the signed-in user's own account, used by `app.admin`,
`app.client` and `app.rescue` so the three apps don't each grow their own
version. It owns the notification preferences form (and the TanStack Query
hooks and Zod-validated service behind it), the account details, change
email, change password and delete account forms, and the confirm-email-change
screen, and composes them with the existing
`TwoFactorSettings` (lib.auth) and `ThemeToggle` (lib.components) into a
tabbed `AccountSettings` component. App-specific settings, such as the
adopter's privacy and pet preferences in `app.client`, are passed in as extra
tabs rather than living here.

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
libraries sit. Depends on `lib.api` (requests), `lib.auth` (session, profile,
password, erasure and two-factor), `lib.components` (form controls, tabs,
theme) and `lib.utils` (UK phone validation). Backs onto these gateway routes:

- `GET` / `PUT /api/v1/notifications/preferences` (`notifications.user_notification_prefs`).
- `PATCH /api/v1/users/account` (name, phone), via `useAuth().updateProfile`.
- `POST /api/v1/auth/change-password`. It ends every session, so the form signs the user out.
- `POST /api/v1/users/me/email-change` (step-up re-auth; the same answer whether
  or not the new address is taken) and `POST /api/v1/auth/confirm-email-change`
  (public; the emailed token is the credential; ends every session).
- `POST /api/v1/users/me/erasure-request`. Step-up re-auth; refuses the last
  active super admin and the last staff member of a rescue with `409`.

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

- **Components**: `AccountSettings` (controlled tabs: Notifications, Security
  (password and two-factor), Appearance, Account (your details, email and
  delete account), then any `extraTabs`; an unknown `value` shows
  Notifications, so stale links still land somewhere;
  `showAccountDetails={false}` drops the name/phone form for an app that edits
  those fields elsewhere), `ConfirmEmailChange` (landing screen for the emailed
  link; confirms on a click, never on page load, because link scanners would
  spend the one-time token), `NotificationPreferencesForm` (channels,
  categories, quiet hours and timezone). There is deliberately no email digest
  setting: digest emails read `email_preferences`, which no gateway route exposes yet.
- **Hooks**: `useNotificationPreferences`, `useUpdateNotificationPreferences`
  (cached per signed-in user; the query waits until someone is signed in),
  `NOTIFICATION_PREFERENCES_QUERY_KEY` (the key prefix, for invalidation).
- **Service functions**: `fetchNotificationPreferences`,
  `updateNotificationPreferences`.

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
