# MarkdownEditor

A rich markdown editor component with live preview and formatting toolbar.

> **Not exported** from `src/index.ts` — import it by relative path within this
> package, or add it to `src/index.ts` first.

## Usage

```tsx
import { MarkdownEditor } from './MarkdownEditor'

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
