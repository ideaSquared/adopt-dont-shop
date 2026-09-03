# Tooltip

Wraps a child element with a hover/focus tooltip. Default export from
`Tooltip.tsx`.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

```tsx
import Tooltip from './Tooltip';

<Tooltip content='Save changes' side='bottom'>
  <button>Save</button>
</Tooltip>;
```

## Props

| Prop        | Type                                     | Required | Default    | Description                   |
| ----------- | ---------------------------------------- | -------- | ---------- | ----------------------------- |
| `content`   | `ReactNode`                              | Yes      | —          | Tooltip body.                 |
| `children`  | `ReactNode`                              | Yes      | —          | Trigger element.              |
| `side`      | `'top' \| 'right' \| 'bottom' \| 'left'` | No       | `'top'`    | Side of the trigger.          |
| `align`     | `'start' \| 'center' \| 'end'`           | No       | `'center'` | Alignment along that side.    |
| `className` | `string`                                 | No       | —          | Override the tooltip's class. |
