# DateInput

Thin wrapper around `<input type="date">` for ISO date strings.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

```tsx
import { DateInput } from './DateInput';

const [value, setValue] = useState('');

<DateInput
  id='dob'
  value={value}
  onChange={e => setValue(e.target.value)}
  min='1900-01-01'
  max={new Date().toISOString().slice(0, 10)}
/>;
```

## Props

| Prop       | Type                                         | Required | Description                         |
| ---------- | -------------------------------------------- | -------- | ----------------------------------- |
| `value`    | `string`                                     | Yes      | ISO date string (YYYY-MM-DD).       |
| `onChange` | `(e: ChangeEvent<HTMLInputElement>) => void` | Yes      | Native change handler.              |
| `disabled` | `boolean`                                    | No       | Disable the input.                  |
| `min`      | `string`                                     | No       | Earliest selectable ISO date.       |
| `max`      | `string`                                     | No       | Latest selectable ISO date.         |
| `id`       | `string`                                     | No       | Used by external `<label htmlFor>`. |
