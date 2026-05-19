# ThemeToggle

Reads the current theme from `useTheme()` and toggles it. Takes no props. Source: `ThemeToggle.tsx`.

Not re-exported from `lib.components/src/index.ts` — import from the component path:

```tsx
import { ThemeToggle } from '@adopt-dont-shop/lib.components/src/components/ui/ThemeToggle/ThemeToggle';

<ThemeToggle />
```

Wrap the consumer tree with the theme provider that exposes `useTheme()` (see the app it's mounted in for the exact provider).
