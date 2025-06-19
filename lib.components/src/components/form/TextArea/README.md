# TextArea Component

A textarea component with auto-resize, character counting, and validation features.

## Usage

```tsx
import { TextArea } from '@/components/form/TextArea'

// Basic usage
<TextArea 
  value={text}
  onChange={handleChange}
  placeholder="Enter your message..."
/>

// With advanced features
<TextArea 
  value={text}
  onChange={handleChange}
  placeholder="Write your description..."
  rows={4}
  maxLength={500}
  showCharCount={true}
  autoResize={true}
  error={errorMessage}
  className="custom-textarea"
/>
```

## Props

- `value`: Current text value
- `onChange`: Function called when text changes
- `placeholder`: Placeholder text
- `rows`: Number of visible rows
- `maxLength`: Maximum character limit
- `showCharCount`: Whether to show character counter
- `autoResize`: Whether to auto-resize based on content
- `error`: Error message to display
- `disabled`: Whether the textarea is disabled
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying textarea element

## Features

- Auto-resize functionality
- Character counting
- Character limit enforcement
- Error state handling
- Accessible markup
- TypeScript support
- Consistent form styling 