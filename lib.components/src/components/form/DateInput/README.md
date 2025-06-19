# DateInput Component

A date input component with date picker functionality and consistent styling.

## Usage

```tsx
import { DateInput } from '@/components/form/DateInput'

// Basic usage
<DateInput 
  value={selectedDate}
  onChange={handleDateChange}
/>

// With custom configuration
<DateInput 
  value={selectedDate}
  onChange={handleDateChange}
  placeholder="Select a date..."
  minDate={minDate}
  maxDate={maxDate}
  className="custom-date-input"
/>
```

## Props

- `value`: Currently selected date
- `onChange`: Function called when date changes
- `placeholder`: Optional placeholder text
- `minDate`: Minimum selectable date
- `maxDate`: Maximum selectable date
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying input element

## Features

- Date picker integration
- Date validation
- Keyboard navigation
- Accessible markup
- TypeScript support
- Consistent with other form inputs 