---
name: accessibility
description: >
  Accessibility rules for React components, pages, and form UI. Apply when writing
  or modifying any JSX, custom component, modal, dropdown, form input, navigation,
  or page-level layout.
---

# Accessibility Rules

The platform targets WCAG AA across all three themes (`light`, `normal`, `dark`).
See `docs/ACCESSIBILITY.md` for the architectural notes. This skill captures the
authoring rules that prevent regressions.

## Semantic HTML first

Use the right element for the job before reaching for ARIA. Most a11y bugs come
from `<div>` doing the job of something else.

| Job | Use | Not |
|-----|-----|-----|
| Click target that submits / navigates | `<button>` or `<a>` | `<div onClick>` |
| Heading hierarchy | `<h1>`–`<h6>` (one `<h1>` per page) | `<div class="heading-1">` |
| Form fields | `<input>` with `<label>` | `<div>` with placeholder only |
| Lists | `<ul>` / `<ol>` / `<li>` | flex `<div>`s |
| Tabular data | `<table>` | grid of `<div>`s |
| Region landmarks | `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>` | unlabeled `<div>` |

**Rule of thumb:** every interactive element should be reachable via Tab and
operable via Enter/Space without extra code on your part. If you're adding
keydown handlers to a `<div>`, you've picked the wrong element.

## Names — every interactive element must have one

Buttons, links, inputs, and icon-only controls need an accessible name. In order
of preference:

1. **Visible text content** — `<button>Save changes</button>`
2. **`aria-label`** — for icon-only buttons (`<IconButton aria-label="Close menu">`)
3. **`aria-labelledby`** — when the name is rendered elsewhere on the page
4. **`<label htmlFor>`** — for every form input (or wrap the input)

```typescript
// GOOD
<button aria-label="Close dialog" onClick={onClose}>
  <X aria-hidden />
</button>

<label htmlFor="email">Email</label>
<input id="email" type="email" />

// BAD — screen reader announces "button" with no name
<button onClick={onClose}><X /></button>

// BAD — placeholder is not a label
<input type="email" placeholder="Email" />
```

For icons inside labelled buttons, mark the icon `aria-hidden` so it doesn't
double up the announcement.

## Form fields — required for forms

Every input, textarea, and select must:

1. Have an associated `<label>` (use `<FormField>` from `lib.components` which
   handles this — see the `forms` skill)
2. Surface validation errors via `aria-describedby` pointing at the error text
3. Set `aria-invalid="true"` while in an error state
4. Be focusable in tab order

The `FormField` component in `lib.components/src/components/form/FormField` wires
all of this up — use it rather than building from scratch.

## Focus management

- **Modals/dialogs**: focus the first interactive element on open, restore focus
  to the trigger on close. Trap focus inside while open.
- **Route changes**: scroll to top and move focus to the new page's `<h1>` or
  `<main>`.
- **Inline state updates** (banners, errors): use `aria-live="polite"` (or
  `assertive` for critical) so screen readers announce them.
- **Never** set `tabIndex={-1}` on a control unless you're managing focus
  programmatically. Never set `tabIndex` > 0 — it breaks natural order.

## Keyboard support

Standard interactions must work without a mouse:

| Element | Keys |
|---------|------|
| Button | Enter, Space activates |
| Link | Enter activates |
| Checkbox | Space toggles |
| Radio group | Arrow keys move within group, Tab leaves |
| Select / combobox | Up/Down arrows, Enter selects, Escape closes |
| Dialog | Escape closes |
| Tabs | Left/Right arrows move, Home/End jump |

If you're building a custom widget, refer to the WAI-ARIA Authoring Practices for
the keyboard pattern — don't invent your own.

## Color and contrast

- All text must hit WCAG AA contrast (4.5:1 normal, 3:1 large) against its
  background. Theme tokens are already verified; **use `vars.*` not hex literals**
  (see the `design-tokens` skill).
- Never convey state by colour alone. Pair red/green with an icon, text, or
  underline.
- Focus indicators must be visible — don't `outline: none` without an explicit
  alternative.

```typescript
// BAD — only colour tells the user this is an error
<span style={{ color: 'red' }}>Invalid postcode</span>

// GOOD — icon + colour + assistive text
<span role="alert">
  <AlertIcon aria-hidden /> Invalid postcode
</span>
```

## Reduced motion

Respect `prefers-reduced-motion` on any transition/animation:

```typescript
// In a *.css.ts file
import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const card = style({
  transition: `transform ${vars.transitions.fast}`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});
```

The new-component skill includes this pattern by default — keep it.

## Images and icons

- Meaningful images: `<img alt="A border collie puppy sitting on a sofa">`
- Decorative images: `<img alt="">` (empty string, not omitted)
- Icons that duplicate visible text: `aria-hidden` so they don't double-announce
- SVG icons used as the only label: wrap in a button with `aria-label`

## Page structure

Every page should have:

- One `<h1>` describing the page
- Heading hierarchy that doesn't skip levels (no `<h3>` directly after `<h1>`)
- A `<main>` landmark wrapping the primary content
- Skip-to-content link (provided by the app shell — don't remove it)

## Testing accessibility

In React Testing Library, query by accessibility metadata — this exercises a11y
as a side effect:

```typescript
screen.getByRole('button', { name: /save/i });  // exercises accessible name
screen.getByLabelText(/email/i);                 // exercises input label
```

If `getByRole` can't find your control, it's probably not accessible.

For automated audits, run axe via `@axe-core/react` in dev or `vitest-axe` in
tests. The Playwright e2e suite runs axe on key pages — don't add regressions.

## Common mistakes

- `<div onClick>` for clickable things — use `<button>`
- Icon-only buttons with no `aria-label` — screen readers announce "button"
- Placeholder used as the only label — disappears on input, fails screen readers
- `outline: none` on focus — invisible focus state, keyboard users get lost
- Skipped heading levels (`<h1>` then `<h3>`) — breaks navigation by heading
- `tabIndex={0}` on every clickable div — symptom of using the wrong element
- Colour-only state indication (red invalid, green valid) — fails colour-blind users
- Auto-playing animation/video without controls — vestibular and attention issues
- Hidden text fields used as state (e.g. `<input type="hidden">` carrying meaning
  for sighted users) — invisible to assistive tech
