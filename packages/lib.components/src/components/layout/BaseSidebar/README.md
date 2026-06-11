# BaseSidebar

Controlled drawer/sidebar primitive. Source: `BaseSidebar.tsx`. Not re-exported from `lib.components/src/index.ts`.

```tsx
import BaseSidebar from '@adopt-dont-shop/lib.components/src/components/layout/BaseSidebar/BaseSidebar';

<BaseSidebar
  show={isOpen}
  handleClose={() => setIsOpen(false)}
  title="Filters"
  size="md"
>
  <FilterForm />
</BaseSidebar>
```

## Props

| Prop          | Type           | Required | Description                            |
| ------------- | -------------- | -------- | -------------------------------------- |
| `show`        | `boolean`      | Yes      | Whether the sidebar is open.           |
| `handleClose` | `() => void`   | Yes      | Called when the user dismisses it.     |
| `title`       | `string`       | Yes      | Header text.                           |
| `size`        | `string`       | No       | Width preset (component-defined).      |
| `children`    | `ReactNode`    | Yes      | Body content.                          |
