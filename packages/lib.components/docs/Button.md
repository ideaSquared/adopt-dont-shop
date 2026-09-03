# Button

The standard button: tone/size variants, a loading state with a spinner, and
optional start/end icons. Extends the native `<button>` attributes.

## Usage

```tsx
import { Button } from '@adopt-dont-shop/lib.components';

<Button variant='primary' onClick={save}>
  Save
</Button>;
```

## Props

`ButtonProps` extends `React.ButtonHTMLAttributes<HTMLButtonElement>`.

| Prop          | Type                                                                                               | Required | Default     | Description                      |
| ------------- | -------------------------------------------------------------------------------------------------- | -------- | ----------- | -------------------------------- |
| `children`    | `React.ReactNode`                                                                                  | Yes      | —           | Button content.                  |
| `variant`     | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'success' \| 'danger' \| 'warning' \| 'info'` | No       | `'primary'` | Visual tone.                     |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                                             | No       | `'md'`      | Button size.                     |
| `isLoading`   | `boolean`                                                                                          | No       | `false`     | Show a spinner and block clicks. |
| `isFullWidth` | `boolean`                                                                                          | No       | `false`     | Stretch to container width.      |
| `isRounded`   | `boolean`                                                                                          | No       | `false`     | Fully rounded corners.           |
| `disabled`    | `boolean`                                                                                          | No       | `false`     | Disable the button.              |
| `startIcon`   | `React.ReactNode`                                                                                  | No       | —           | Icon before the label.           |
| `endIcon`     | `React.ReactNode`                                                                                  | No       | —           | Icon after the label.            |
| `type`        | `'button' \| 'submit' \| 'reset'`                                                                  | No       | `'button'`  | Native button type.              |
| `className`   | `string`                                                                                           | No       | —           | Extra class.                     |

All other native `<button>` props pass through.

## Accessibility

Renders a native `<button>`, so it is keyboard-focusable and activates on
Enter/Space. When `isLoading` or `disabled`, clicks are suppressed. Icon-only
buttons must still carry an accessible name — pass visible text or an
`aria-label`.
