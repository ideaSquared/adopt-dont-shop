# TextInput Component

A text input component with validation, icons, and various input types support.

## Usage

```tsx
import { TextInput } from '@/components/form/TextInput'

// Basic usage
<TextInput 
  value={inputValue}
  onChange={handleChange}
  placeholder="Enter text..."
/>

// With advanced features
<TextInput 
  value={inputValue}
  onChange={handleChange}
  type="email"
  placeholder="Enter your email..."
  label="Email Address"
  error={errorMessage}
  leftIcon={<EmailIcon />}
  rightIcon={<ValidateIcon />}
  disabled={isDisabled}
  className="custom-input"
/>
```

## Props

- `value`: Current input value
- `onChange`: Function called when input changes
- `type`: Input type (text, email, password, number, etc.)
- `placeholder`: Placeholder text
- `label`: Label text for the input
- `error`: Error message to display
- `leftIcon`: Icon to display on the left side
- `rightIcon`: Icon to display on the right side
- `disabled`: Whether the input is disabled
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying input element

## Features

- Multiple input types support
- Icon placement (left/right)
- Error state handling
- Label and placeholder text
- Accessible markup
- TypeScript support
- Consistent form styling 