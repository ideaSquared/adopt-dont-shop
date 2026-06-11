# CheckboxInput Component

A checkbox input component with label, validation, and consistent styling across the application.

## Usage

```tsx
import { CheckboxInput } from '@/components/form/CheckboxInput'

// Basic usage
<CheckboxInput
  checked={isChecked}
  onChange={handleChange}
  label="Accept terms and conditions"
/>

// With validation and custom styling
<CheckboxInput
  checked={isChecked}
  onChange={handleChange}
  label="Enable notifications"
  error={errorMessage}
  disabled={isDisabled}
  className="custom-checkbox"
/>
```

## Props

- `checked`: Whether the checkbox is checked
- `onChange`: Function called when checkbox state changes
- `label`: Label text for the checkbox
- `error`: Error message to display
- `disabled`: Whether the checkbox is disabled
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying input element

## Features

- Accessible markup with proper labeling
- Error state handling
- Disabled state styling
- Consistent form styling
- TypeScript support
- Touch-friendly design
