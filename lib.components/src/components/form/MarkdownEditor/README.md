# MarkdownEditor Component

A rich markdown editor component with live preview and formatting toolbar.

## Usage

```tsx
import { MarkdownEditor } from '@/components/form/MarkdownEditor'

// Basic usage
<MarkdownEditor
  value={content}
  onChange={handleContentChange}
/>

// With custom configuration
<MarkdownEditor
  value={content}
  onChange={handleContentChange}
  placeholder="Write your markdown here..."
  showPreview={true}
  className="custom-editor"
/>
```

## Props

- `value`: Current markdown content
- `onChange`: Function called when content changes
- `placeholder`: Optional placeholder text
- `showPreview`: Whether to show live preview
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Live markdown preview
- Formatting toolbar
- Syntax highlighting
- Accessible markup
- TypeScript support
