# Card

A surface container with padding, border, and elevation variants, plus
`CardHeader` / `CardContent` / `CardFooter` sub-components for structured
layout.

## Usage

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@adopt-dont-shop/lib.components';

<Card variant='elevated'>
  <CardHeader bordered>Pet</CardHeader>
  <CardContent>Details…</CardContent>
  <CardFooter>Actions…</CardFooter>
</Card>;
```

## Props

### `Card`

`CardProps` extends `React.HTMLAttributes<HTMLDivElement>`.

| Prop        | Type                                                           | Required | Default     | Description                                  |
| ----------- | -------------------------------------------------------------- | -------- | ----------- | -------------------------------------------- |
| `children`  | `React.ReactNode`                                              | Yes      | —           | Card content.                                |
| `variant`   | `'default' \| 'outlined' \| 'elevated' \| 'filled' \| 'glass'` | No       | `'default'` | Surface style.                               |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'`                               | No       | `'md'`      | Inner padding.                               |
| `hoverable` | `boolean`                                                      | No       | `false`     | Apply hover affordance.                      |
| `bordered`  | `boolean`                                                      | No       | `false`     | Draw a border.                               |
| `clickable` | `boolean`                                                      | No       | `false`     | Make the card focusable and `role="button"`. |

### `CardHeader`

| Prop       | Type              | Required | Default | Description                      |
| ---------- | ----------------- | -------- | ------- | -------------------------------- |
| `children` | `React.ReactNode` | Yes      | —       | Header content.                  |
| `bordered` | `boolean`         | No       | `false` | Draw a divider below the header. |

`CardContent` and `CardFooter` take `children` plus native `<div>` attributes.

## Accessibility

By default `Card` is a plain `<div>`. Setting `clickable` gives it
`role="button"` and `tabIndex={0}` so it is focusable, but it does not add
keyboard (Enter/Space) activation — supply an `onKeyDown` handler, or prefer a
real `Button`/link for primary actions.
