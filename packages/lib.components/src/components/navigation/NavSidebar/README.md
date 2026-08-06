# NavSidebar

A shared left navigation sidebar for the staff-facing apps (admin, rescue). It
renders grouped `NavLink` items with active state, optional numeric badges, an
optional desktop collapse, and a controlled off-canvas drawer on mobile that
behaves as a modal dialog (focus trap, Escape to close, focus restore, auto-close
on route change). Branding and footer are slots, so each app supplies its own
logo and user block.

> Requires a react-router context (it uses `NavLink`/`useLocation`). Permission
> filtering is the caller's responsibility — pass only the groups/items that
> should be visible.

## Usage

```tsx
import { NavSidebar, type NavSidebarGroup } from '@adopt-dont-shop/lib.components';

const groups: NavSidebarGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: <FiHome />, end: true },
      { to: '/pets', label: 'Pets', icon: <FiHeart /> },
    ],
  },
];

<NavSidebar
  groups={groups}
  header={<Logo darkBg />}
  footer={<SignOutButton />}
  collapsible
  collapsed={collapsed}
  onToggleCollapsed={toggle}
  mobileOpen={mobileOpen}
  onMobileClose={closeMobile}
/>;
```

## Props

| Prop                                              | Type                                 | Description                                                                        |
| ------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `groups`                                          | `NavSidebarGroup[]`                  | Groups of items. Each item: `{ to, label, icon?, badge?, badgeAriaLabel?, end? }`. |
| `header`                                          | `ReactNode`                          | Branding shown in the header (e.g. a `<Logo/>`).                                   |
| `footer`                                          | `ReactNode`                          | Footer slot (e.g. user info + sign-out).                                           |
| `collapsible` / `collapsed` / `onToggleCollapsed` | `boolean` / `boolean` / `() => void` | Desktop icon-only collapse.                                                        |
| `mobileOpen` / `onMobileClose`                    | `boolean` / `() => void`             | Controlled off-canvas drawer.                                                      |
| `ariaLabel`                                       | `string`                             | Landmark label (default `"Main navigation"`).                                      |
| `className`, `data-testid`                        | `string`                             | Passthrough.                                                                       |

## Accessibility

- Renders an `<aside aria-label>` landmark with grouped items (`role="group"` +
  labelled heading per group).
- Active item is a react-router `NavLink` (`aria-current="page"`).
- On mobile the open drawer is `role="dialog" aria-modal="true"` with a Tab focus
  trap, Escape-to-close, focus move to the close button, and focus restore on
  close. It auto-closes after navigating.
