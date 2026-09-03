# SkipLink

A visually hidden link that becomes visible on keyboard focus, letting keyboard
and screen-reader users bypass the navigation chrome and jump to the main
content. Render it as the first focusable element in the app shell.

## Usage

```tsx
import { SkipLink } from '@adopt-dont-shop/lib.components';

<SkipLink />;
{
  /* … nav … */
}
<main id='main-content'>…</main>;
```

## Props

| Prop        | Type              | Required | Default                  | Description                                  |
| ----------- | ----------------- | -------- | ------------------------ | -------------------------------------------- |
| `href`      | `string`          | No       | `'#main-content'`        | Anchor target id of the main content region. |
| `children`  | `React.ReactNode` | No       | `'Skip to main content'` | Link label.                                  |
| `className` | `string`          | No       | —                        | Extra class on the anchor.                   |

## Accessibility

This is the skip-link a11y primitive itself: it is off-screen until focused,
then reveals on `:focus` so sighted keyboard users can see it. The `href` must
point at an existing element id (default `#main-content`) — make sure the main
region carries that id and is focusable/scrollable as the jump target. Place it
before all other focusable content.
