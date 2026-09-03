# DropdownButton

Button-styled dropdown that renders a list of label/route/onClick items.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

```tsx
import DropdownButton from './DropdownButton';

<DropdownButton
  triggerLabel='Actions'
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete },
  ]}
/>;
```

## Props

| Prop           | Type             | Required | Description                                                  |
| -------------- | ---------------- | -------- | ------------------------------------------------------------ |
| `triggerLabel` | `string`         | Yes      | Text rendered on the trigger button.                         |
| `items`        | `DropdownItem[]` | Yes      | Each item has `label`, and either `to` (route) or `onClick`. |
| `className`    | `string`         | No       | Override the root element's class.                           |
