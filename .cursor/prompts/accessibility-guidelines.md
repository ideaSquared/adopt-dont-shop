# Accessibility Guidelines

## WCAG Compliance

- Target WCAG 2.1 AA compliance minimum, AAA when feasible
- Test with axe-core or similar automated tools
- Conduct manual testing with screen readers (NVDA, JAWS, VoiceOver)
- Include accessibility in QA processes
- Audit regularly with Lighthouse

## Keyboard Navigation

- Ensure all interactive elements are keyboard accessible
- Implement logical tab order (tabindex="0" or natural DOM order)
- Provide visible focus indicators (outline, background change)
- Support keyboard shortcuts for common actions
- Implement skip links for navigation

## Screen Reader Support

- Use semantic HTML elements (`<nav>`, `<main>`, `<button>` vs `<div>`)
- Provide alternative text for images (`alt` attributes)
- Use ARIA landmarks for page structure (`role="navigation"`, etc.)
- Implement ARIA attributes only when necessary (`aria-label`, `aria-expanded`)
- Create descriptive link text (avoid "click here")

## Focus Management

- Return focus after actions (modals, dropdowns)
- Trap focus in modal dialogs
- Maintain focus position during dynamic content updates
- Move focus to error messages when form validation fails
- Provide clear focus indicators that meet contrast requirements

## Color and Contrast

- Ensure text meets contrast requirements (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color to convey meaning
- Provide visual indicators in addition to color
- Ensure focus states have adequate contrast
- Support high contrast mode

## Forms and Inputs

- Associate labels with form controls (explicit `<label for="id">` or aria-labelledby)
- Group related form elements with `<fieldset>` and `<legend>`
- Provide clear error messages and indicate which fields have errors
- Support autocomplete attributes for common fields
- Ensure form controls have accessible names and roles

## Responsive and Adaptive Design

- Support zoom up to 200% without loss of content
- Allow text resizing without breaking layout
- Design for different input methods (touch, keyboard, voice)
- Support screen magnification
- Test with different font sizes and spacing
