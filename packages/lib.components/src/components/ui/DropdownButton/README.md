# DropdownButton

A bordered, button-styled [`DropdownMenu`](../DropdownMenu/README.md): same items,
keyboard behaviour and accessibility, with the menu aligned to the trigger's end edge.

```tsx
import { DropdownButton } from '@adopt-dont-shop/lib.components';

<DropdownButton
  triggerLabel='Actions'
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, danger: true, separatorBefore: true },
  ]}
/>;
```

## Props

| Prop           | Type                 | Required | Description                                                      |
| -------------- | -------------------- | -------- | ---------------------------------------------------------------- |
| `triggerLabel` | `string`             | Yes      | Text rendered on the trigger button.                             |
| `items`        | `DropdownMenuItem[]` | Yes      | Same item shape as `DropdownMenu` (`label`, `to`, `onClick`, …). |
| `className`    | `string`             | No       | Replaces the trigger button's class.                             |
| `header`       | `ReactNode`          | No       | Non-focusable block rendered above the items.                    |
| `disabled`     | `boolean`            | No       | Disables the trigger.                                            |
