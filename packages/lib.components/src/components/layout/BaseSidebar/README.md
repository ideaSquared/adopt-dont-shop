# BaseSidebar

Controlled drawer/sidebar primitive.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

```tsx
import BaseSidebar from './BaseSidebar';

<BaseSidebar show={isOpen} handleClose={() => setIsOpen(false)} title='Filters' size='md'>
  <FilterForm />
</BaseSidebar>;
```

## Props

| Prop          | Type         | Required | Description                        |
| ------------- | ------------ | -------- | ---------------------------------- |
| `show`        | `boolean`    | Yes      | Whether the sidebar is open.       |
| `handleClose` | `() => void` | Yes      | Called when the user dismisses it. |
| `title`       | `string`     | Yes      | Header text.                       |
| `size`        | `string`     | No       | Width preset (component-defined).  |
| `children`    | `ReactNode`  | Yes      | Body content.                      |
