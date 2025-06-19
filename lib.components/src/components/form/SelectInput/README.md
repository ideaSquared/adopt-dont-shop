# SelectInput Component

A select dropdown component with search functionality, validation, and consistent styling.

## Usage

```tsx
import { SelectInput } from '@/components/form/SelectInput'

// Basic usage
<SelectInput 
  value={selectedValue}
  onChange={handleChange}
  options={options}
  placeholder="Select an option..."
/>

// With advanced features
<SelectInput 
  value={selectedValue}
  onChange={handleChange}
  options={options}
  placeholder="Choose..."
  searchable={true}
  clearable={true}
  error={errorMessage}
  disabled={isDisabled}
  className="custom-select"
/>
```

## Props

- `value`: Currently selected value
- `onChange`: Function called when selection changes
- `options`: Array of option objects with value and label
- `placeholder`: Placeholder text when no option is selected
- `searchable`: Enable search/filter functionality
- `clearable`: Allow clearing the selection
- `error`: Error message to display
- `disabled`: Whether the select is disabled
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Search/filter options
- Keyboard navigation
- Clear selection functionality
- Error state handling
- Accessible markup
- TypeScript support
- Consistent form styling 