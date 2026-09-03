# Dropdown (DropdownMenu)

Click-trigger dropdown that renders a list of label/route/onClick items. Default
export from `DropdownMenu.tsx`; the component is named `Dropdown`.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

```tsx
import Dropdown from './DropdownMenu';

<Dropdown
  triggerLabel='Account'
  items={[
    { label: 'Profile', to: '/profile' },
    { label: 'Sign out', onClick: handleSignOut },
  ]}
/>;
```

## Props

| Prop           | Type             | Required | Description                                                  |
| -------------- | ---------------- | -------- | ------------------------------------------------------------ |
| `triggerLabel` | `string`         | Yes      | Text rendered on the trigger button.                         |
| `items`        | `DropdownItem[]` | Yes      | Each item has `label`, and either `to` (route) or `onClick`. |
