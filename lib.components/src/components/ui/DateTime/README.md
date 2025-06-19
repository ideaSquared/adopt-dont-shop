# DateTime Component

A component for displaying formatted date and time values with consistent styling.

## Usage

```tsx
import { DateTime } from '@/components/ui/DateTime'

// Display current date/time
<DateTime />

// Display specific date
<DateTime date={new Date('2024-01-01')} />

// Custom format
<DateTime 
  date={date}
  format="short"
  className="custom-class"
/>
```

## Props

- `date`: Date object or string to display (defaults to current date)
- `format`: Format style for the date/time display
- `className`: Optional CSS class names
- Additional props are forwarded to the underlying element

## Features

- Multiple date formats
- Timezone handling
- Accessible markup
- TypeScript support 