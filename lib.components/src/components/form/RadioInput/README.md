# RadioInput Component

A flexible radio input component for selecting a single option from a group.

## Usage

```tsx
import { RadioInput } from '@lib/components';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

function MyComponent() {
  const [value, setValue] = useState('');

  return (
    <RadioInput
      name="example"
      options={options}
      value={value}
      onChange={setValue}
      label="Choose an option"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | The name attribute for the radio group (required) |
| `options` | `RadioOption[]` | - | Array of option objects (required) |
| `value` | `string` | - | Controlled value |
| `defaultValue` | `string` | - | Default value for uncontrolled usage |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the radio buttons |
| `state` | `'default' \| 'error' \| 'success' \| 'warning'` | `'default'` | Visual state |
| `disabled` | `boolean` | `false` | Disable all radio options |
| `required` | `boolean` | `false` | Mark as required field |
| `label` | `string` | - | Label for the radio group |
| `error` | `string` | - | Error message to display |
| `helperText` | `string` | - | Helper text to display |
| `direction` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `fullWidth` | `boolean` | `false` | Take full width of container |
| `onChange` | `(value: string) => void` | - | Change handler |

## RadioOption Interface

```tsx
interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

## Examples

### Basic Usage
```tsx
<RadioInput
  name="basic"
  options={[
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ]}
/>
```

### With Error State
```tsx
<RadioInput
  name="validation"
  options={options}
  error="Please select an option"
  required
/>
```

### Horizontal Layout
```tsx
<RadioInput
  name="layout"
  options={options}
  direction="horizontal"
  label="Select preference"
/>
```

### With Disabled Options
```tsx
<RadioInput
  name="mixed"
  options={[
    { value: 'available', label: 'Available' },
    { value: 'unavailable', label: 'Unavailable', disabled: true },
    { value: 'pending', label: 'Pending' }
  ]}
/>
```

### Different Sizes
```tsx
<RadioInput name="small" options={options} size="sm" />
<RadioInput name="medium" options={options} size="md" />
<RadioInput name="large" options={options} size="lg" />
``` 