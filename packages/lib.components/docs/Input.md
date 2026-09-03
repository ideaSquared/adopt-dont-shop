# Input

The standard single-line text input with a label, helper/error text, size and
visual variants, and optional start/end icons. Prefer this over the deprecated
`TextInput`. Extends the native `<input>` attributes.

## Usage

```tsx
import { Input } from '@adopt-dont-shop/lib.components';

<Input label='Email' name='email' type='email' required helperText='We never share it.' />;
```

Inside a form, pair it with `FormField` for label/error scaffolding.

## Props

`InputProps` extends `React.InputHTMLAttributes<HTMLInputElement>` (minus
`size`).

| Prop          | Type                                | Required | Default        | Description                              |
| ------------- | ----------------------------------- | -------- | -------------- | ---------------------------------------- |
| `label`       | `string`                            | No       | —              | Field label, associated with the input.  |
| `helperText`  | `string`                            | No       | —              | Helper text below the input.             |
| `error`       | `string`                            | No       | —              | Error message; forces the error variant. |
| `required`    | `boolean`                           | No       | `false`        | Mark the field required.                 |
| `isFullWidth` | `boolean`                           | No       | `true`         | Stretch to container width.              |
| `size`        | `'sm' \| 'md' \| 'lg'`              | No       | `'md'`         | Control size.                            |
| `variant`     | `'default' \| 'success' \| 'error'` | No       | `'default'`    | Visual variant.                          |
| `startIcon`   | `React.ReactNode`                   | No       | —              | Icon at the start.                       |
| `endIcon`     | `React.ReactNode`                   | No       | —              | Icon at the end.                         |
| `id`          | `string`                            | No       | auto (`useId`) | Input id; auto-generated if omitted.     |

All other native `<input>` props pass through.

## Accessibility

Generates an `id` (via `useId`) when none is given and associates the `label`
with it. Helper and error text are linked through `aria-describedby`, and the
input is marked `aria-invalid` when `error` is set. Always provide a `label` (or
an external `<label htmlFor>`); placeholder text is not an accessible name.
