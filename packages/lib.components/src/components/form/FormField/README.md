# FormField

Label + description + error scaffolding for a single form control, plus
`FormRow` and `FormSection` for laying groups of fields out. Wires the message
to its control via `aria-describedby` so the field stays accessible.

## Usage

```tsx
import { FormField, FormRow, FormSection, Input } from '@adopt-dont-shop/lib.components';

<FormSection title='Contact' description='How we reach you'>
  <FormRow columns='two'>
    <FormField label='First name' htmlFor='first' required>
      <Input id='first' name='first' />
    </FormField>
    <FormField label='Email' htmlFor='email' error={errors.email}>
      <Input id='email' name='email' type='email' />
    </FormField>
  </FormRow>
</FormSection>;
```

## Props

### `FormField`

| Prop          | Type              | Required | Default | Description                                                                                      |
| ------------- | ----------------- | -------- | ------- | ------------------------------------------------------------------------------------------------ |
| `children`    | `React.ReactNode` | Yes      | —       | The control. A single valid element child is augmented with `aria-describedby` / `aria-invalid`. |
| `label`       | `string`          | No       | —       | Field label; associated via `htmlFor`.                                                           |
| `htmlFor`     | `string`          | No       | —       | Control id the label points at.                                                                  |
| `required`    | `boolean`         | No       | `false` | Renders a required marker.                                                                       |
| `description` | `string`          | No       | —       | Helper text; hidden while an `error` is shown.                                                   |
| `error`       | `string`          | No       | —       | Error message; announced via `role="alert"`.                                                     |
| `fullWidth`   | `boolean`         | No       | `false` | Stretches the field to its container width.                                                      |
| `className`   | `string`          | No       | —       | Extra class on the wrapper.                                                                      |

### `FormRow`

| Prop        | Type                                     | Required | Default  | Description            |
| ----------- | ---------------------------------------- | -------- | -------- | ---------------------- |
| `children`  | `React.ReactNode`                        | Yes      | —        | The fields in the row. |
| `columns`   | `'auto' \| 'single' \| 'two' \| 'three'` | No       | `'auto'` | Column layout.         |
| `className` | `string`                                 | No       | —        | Extra class.           |

### `FormSection`

| Prop          | Type              | Required | Default | Description                |
| ------------- | ----------------- | -------- | ------- | -------------------------- |
| `children`    | `React.ReactNode` | Yes      | —       | The section's rows/fields. |
| `title`       | `string`          | No       | —       | Section heading (`<h3>`).  |
| `description` | `string`          | No       | —       | Section description.       |
| `className`   | `string`          | No       | —       | Extra class.               |

## Accessibility

`FormField` associates its label with the control through `htmlFor`, and wires
`description`/`error` to the control via `aria-describedby` (and `aria-invalid`
when in error) so screen readers announce the message when the field regains
focus. The error also renders with `role="alert"` so it is announced the moment
it appears. Only a single valid element child is augmented; give that control a
stable `id` matching `htmlFor`.
