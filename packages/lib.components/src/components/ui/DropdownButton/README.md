# DropdownButton

Button-styled dropdown that renders a list of label/route/onClick items. Source: `DropdownButton.tsx`. Not re-exported from `lib.components/src/index.ts`.

```tsx
import DropdownButton from '@adopt-dont-shop/lib.components/src/components/ui/DropdownButton/DropdownButton';

<DropdownButton
  triggerLabel="Actions"
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete },
  ]}
/>
```

## Props

| Prop           | Type             | Required | Description                                                       |
| -------------- | ---------------- | -------- | ----------------------------------------------------------------- |
| `triggerLabel` | `string`         | Yes      | Text rendered on the trigger button.                              |
| `items`        | `DropdownItem[]` | Yes      | Each item has `label`, and either `to` (route) or `onClick`.      |
| `className`    | `string`         | No       | Override the root element's class.                                |
