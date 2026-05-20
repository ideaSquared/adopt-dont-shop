# Dropdown (DropdownMenu)

Click-trigger dropdown that renders a list of label/route/onClick items. Default export from `DropdownMenu.tsx` (component is named `Dropdown`, file is `DropdownMenu.tsx`). Not re-exported from `lib.components/src/index.ts`.

```tsx
import Dropdown from '@adopt-dont-shop/lib.components/src/components/ui/DropdownMenu/DropdownMenu';

<Dropdown
  triggerLabel="Account"
  items={[
    { label: 'Profile', to: '/profile' },
    { label: 'Sign out', onClick: handleSignOut },
  ]}
/>
```

## Props

| Prop           | Type             | Required | Description                                                       |
| -------------- | ---------------- | -------- | ----------------------------------------------------------------- |
| `triggerLabel` | `string`         | Yes      | Text rendered on the trigger button.                              |
| `items`        | `DropdownItem[]` | Yes      | Each item has `label`, and either `to` (route) or `onClick`.      |
