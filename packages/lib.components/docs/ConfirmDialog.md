# ConfirmDialog

A small confirm/cancel dialog built on `Modal` and `Button`, with tone variants
that set a default title and confirm-button style. Use it to gate a destructive
or irreversible action.

## Usage

```tsx
import { ConfirmDialog } from '@adopt-dont-shop/lib.components';

<ConfirmDialog
  isOpen={open}
  onClose={() => setOpen(false)}
  onConfirm={deletePet}
  variant='danger'
  message='Delete this pet? This cannot be undone.'
  confirmText='Delete'
/>;
```

Prefer the `useConfirm` hook for one-off imperative confirmations.

## Props

| Prop          | Type                              | Required | Default       | Description                                        |
| ------------- | --------------------------------- | -------- | ------------- | -------------------------------------------------- |
| `isOpen`      | `boolean`                         | Yes      | —             | Whether the dialog is shown.                       |
| `onClose`     | `() => void`                      | Yes      | —             | Called on cancel / close.                          |
| `onConfirm`   | `() => void`                      | Yes      | —             | Called on confirm (then `onClose` runs).           |
| `message`     | `string`                          | Yes      | —             | The confirmation prompt.                           |
| `title`       | `string`                          | No       | per `variant` | Dialog heading.                                    |
| `confirmText` | `string`                          | No       | `'Confirm'`   | Confirm button label.                              |
| `cancelText`  | `string`                          | No       | `'Cancel'`    | Cancel button label.                               |
| `variant`     | `'danger' \| 'warning' \| 'info'` | No       | `'info'`      | Tone; sets default title and confirm-button style. |
| `data-testid` | `string`                          | No       | —             | Test id.                                           |

## Accessibility

Inherits `Modal`'s dialog semantics: focus trap, focus restore, and an
accessible name from the (defaulted) title. Overlay-click close is disabled, so
the user must choose confirm or cancel. Write `message` as a clear question and
`confirmText` as the specific action (e.g. "Delete") rather than a generic "OK".
