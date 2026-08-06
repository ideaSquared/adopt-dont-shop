# DateRangePicker

A shared from/to date-range control, composed from the existing `DateInput`
(native `<input type="date">`, which renders in the user's locale —
`dd/mm/yyyy` for en-GB). Values are ISO `yyyy-mm-dd` strings (or `null`).

## Usage

```tsx
import { DateRangePicker, type DateRangeValue } from '@adopt-dont-shop/lib.components';
import { useState } from 'react';

const Example = () => {
  const [range, setRange] = useState<DateRangeValue>({ from: null, to: null });
  return <DateRangePicker value={range} onChange={setRange} />;
};
```

## Props

| Prop          | Type                                           | Default  | Description                                          |
| ------------- | ---------------------------------------------- | -------- | ---------------------------------------------------- |
| `value`       | `{ from: string \| null; to: string \| null }` | —        | The current range (ISO `yyyy-mm-dd`).                |
| `onChange`    | `(value: DateRangeValue) => void`              | —        | Called with the merged range on any field change.    |
| `fromLabel`   | `string`                                       | `'From'` | Label for the start field.                           |
| `toLabel`     | `string`                                       | `'To'`   | Label for the end field.                             |
| `min`         | `string`                                       | —        | Minimum selectable date (ISO).                       |
| `max`         | `string`                                       | —        | Maximum selectable date (ISO).                       |
| `disabled`    | `boolean`                                      | `false`  | Disables both fields.                                |
| `error`       | `string`                                       | —        | Caller-supplied error; overrides the built-in check. |
| `required`    | `boolean`                                      | `false`  | Renders a required marker on each label.             |
| `className`   | `string`                                       | —        | Extra class on the container.                        |
| `data-testid` | `string`                                       | —        | Test id on the container.                            |

## Behaviour & accessibility

- Each field has an associated `<label htmlFor>`; the group is keyboard operable.
- The `from` field constrains the `to` field's minimum and vice versa.
- When `to` precedes `from` (or a caller `error` is set), an accessible
  `role="alert"` message is announced.
