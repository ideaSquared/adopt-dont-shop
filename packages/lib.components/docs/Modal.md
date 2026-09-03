# Modal

A portalled dialog with a focus trap, Escape/overlay close, and optional
header/footer slots. The base for `ConfirmDialog` and app-level dialogs.

## Usage

```tsx
import { Modal, Button } from '@adopt-dont-shop/lib.components';

<Modal isOpen={open} onClose={() => setOpen(false)} title='Edit pet'>
  <EditPetForm />
</Modal>;
```

## Props

| Prop                  | Type                                     | Required | Default | Description                                        |
| --------------------- | ---------------------------------------- | -------- | ------- | -------------------------------------------------- |
| `isOpen`              | `boolean`                                | Yes      | —       | Whether the dialog is shown.                       |
| `onClose`             | `() => void`                             | Yes      | —       | Called on close (button, overlay, Escape).         |
| `children`            | `React.ReactNode`                        | Yes      | —       | Dialog body.                                       |
| `title`               | `string`                                 | No       | —       | Heading; also the dialog's accessible name.        |
| `size`                | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | No       | `'md'`  | Dialog width.                                      |
| `showCloseButton`     | `boolean`                                | No       | `true`  | Render the header close button.                    |
| `closeOnOverlayClick` | `boolean`                                | No       | `true`  | Close when the backdrop is clicked.                |
| `closeOnEscape`       | `boolean`                                | No       | `true`  | Close on Escape; set `false` for blocking dialogs. |
| `centered`            | `boolean`                                | No       | `true`  | Vertically centre the dialog.                      |
| `header`              | `React.ReactNode`                        | No       | —       | Custom header slot (replaces `title` markup).      |
| `footer`              | `React.ReactNode`                        | No       | —       | Footer slot (actions).                             |
| `className`           | `string`                                 | No       | —       | Extra class on the dialog.                         |
| `data-testid`         | `string`                                 | No       | —       | Test id on the dialog.                             |

## Accessibility

Renders into a portal as a modal dialog: focus moves into the dialog on open,
is trapped within it (Tab/Shift+Tab cycle), and returns to the previously
focused element on close. Escape closes it unless `closeOnEscape={false}`. The
dialog is labelled by `title`; when using a custom `header`, ensure it still
provides an accessible name.
