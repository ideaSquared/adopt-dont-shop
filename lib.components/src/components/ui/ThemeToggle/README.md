# ThemeToggle Component

A theme toggle component for switching between light and dark themes with smooth transitions.

## Usage

```tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle'

// Basic usage
<ThemeToggle />

// With custom configuration
<ThemeToggle 
  currentTheme={theme}
  onThemeChange={handleThemeChange}
  showLabel={true}
  className="custom-toggle"
/>
```

## Props

- `currentTheme`: Current theme value
- `onThemeChange`: Function called when theme changes
- `showLabel`: Whether to show theme labels
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Smooth theme transitions
- Icon indicators
- Keyboard accessible
- Persistent theme storage
- Accessible markup
- TypeScript support 