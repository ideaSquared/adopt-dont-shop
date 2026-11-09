# DropdownMenu

Click-to-open menu of actions and links built on Radix `DropdownMenu`. Radix supplies
the `menu` / `menuitem` roles, `aria-expanded` on the trigger, arrow-key / Home / End /
type-ahead navigation, Escape to close with focus returned to the trigger, and rendering
in a portal. The menu is named after its trigger.

```tsx
import { DropdownMenu } from '@adopt-dont-shop/lib.components';

<DropdownMenu
  triggerLabel='Account'
  items={[
    { label: 'Profile', to: '/profile' },
    { label: 'Sign out', onClick: handleSignOut, danger: true, separatorBefore: true },
  ]}
/>;
```

A custom trigger (for example an avatar button) replaces the default text button; it
gets `aria-label={triggerLabel}` unless it sets its own:

```tsx
<DropdownMenu
  triggerLabel={`User menu for ${name}`}
  trigger={
    <button type='button'>
      <Avatar name={name} />
    </button>
  }
  header={<strong>{name}</strong>}
  align='end'
  items={items}
/>
```

Items with `to` render a plain `<a href>` (full page load). For client-side routes use
`onClick` with your router's `navigate`.

## Props

| Prop               | Type                           | Required | Default   | Description                                                         |
| ------------------ | ------------------------------ | -------- | --------- | ------------------------------------------------------------------- |
| `triggerLabel`     | `string`                       | Yes      | —         | Text of the default trigger; accessible name of a custom `trigger`. |
| `items`            | `DropdownMenuItem[]`           | Yes      | —         | See below.                                                          |
| `trigger`          | `ReactElement`                 | No       | —         | Single focusable element that replaces the default trigger button.  |
| `triggerClassName` | `string`                       | No       | —         | Replaces the default trigger button's class.                        |
| `header`           | `ReactNode`                    | No       | —         | Non-focusable block rendered above the items (e.g. name and email). |
| `align`            | `'start' \| 'center' \| 'end'` | No       | `'start'` | Alignment of the menu against the trigger.                          |
| `disabled`         | `boolean`                      | No       | `false`   | Disables the trigger.                                               |
| `className`        | `string`                       | No       | —         | Extra class merged onto the menu panel.                             |

### `DropdownMenuItem`

| Field             | Type         | Description                                             |
| ----------------- | ------------ | ------------------------------------------------------- |
| `label`           | `string`     | Item text.                                              |
| `to`              | `string`     | Render as a link to this URL.                           |
| `onClick`         | `() => void` | Called once when the item is selected; the menu closes. |
| `icon`            | `ReactNode`  | Decorative icon (hidden from assistive technology).     |
| `description`     | `string`     | Secondary line under the label.                         |
| `disabled`        | `boolean`    | Not selectable; exposed with `aria-disabled`.           |
| `danger`          | `boolean`    | Destructive styling.                                    |
| `separatorBefore` | `boolean`    | Divider above the item.                                 |
