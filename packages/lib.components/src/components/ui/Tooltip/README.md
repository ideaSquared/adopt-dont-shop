# Tooltip

Wraps a single focusable element with a tooltip that opens on hover and keyboard
focus (Radix), closes on Escape, and is rendered in a portal so it is never
clipped by an `overflow: hidden` ancestor. The trigger is described by the
tooltip content (`aria-describedby`), so keep the content short and supplementary:
it must not be the only place essential information appears.

```tsx
import { Tooltip } from '@adopt-dont-shop/lib.components';

<Tooltip content='Save changes' side='bottom'>
  <button type='button'>Save</button>
</Tooltip>;
```

## Props

| Prop        | Type                                     | Required | Default    | Description                                      |
| ----------- | ---------------------------------------- | -------- | ---------- | ------------------------------------------------ |
| `content`   | `ReactNode`                              | Yes      | —          | Tooltip body.                                    |
| `children`  | `ReactElement`                           | Yes      | —          | The single focusable trigger element.            |
| `side`      | `'top' \| 'right' \| 'bottom' \| 'left'` | No       | `'top'`    | Side of the trigger.                             |
| `align`     | `'start' \| 'center' \| 'end'`           | No       | `'center'` | Alignment along that side.                       |
| `className` | `string`                                 | No       | —          | Extra class merged onto the tooltip content box. |
