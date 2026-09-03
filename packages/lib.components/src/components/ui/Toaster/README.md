# Toaster

The app-wide toast provider (ADS-125): a thin wrapper around
[sonner](https://sonner.emilkowal.ski/) so every app mounts one
consistently-configured toast region. Pair it with the `toast` function to fire
notifications. This supersedes the legacy `Toast` / `ToastContainer`.

## Usage

Mount `Toaster` once near the app root, then call `toast` from anywhere:

```tsx
import { Toaster, toast } from '@adopt-dont-shop/lib.components';

function App() {
  return (
    <>
      <Toaster />
      <button onClick={() => toast.success('Saved')}>Save</button>
    </>
  );
}
```

## Props

`ToasterProps` is sonner's `ToasterProps` unchanged; the wrapper only sets
different defaults. Common props:

| Prop            | Type                                                                                              | Required | Default       | Description                        |
| --------------- | ------------------------------------------------------------------------------------------------- | -------- | ------------- | ---------------------------------- |
| `position`      | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | No       | `'top-right'` | Where toasts stack.                |
| `richColors`    | `boolean`                                                                                         | No       | `true`        | Use sonner's tone-coloured styles. |
| `closeButton`   | `boolean`                                                                                         | No       | `true`        | Show a close button on each toast. |
| `visibleToasts` | `number`                                                                                          | No       | `3`           | Max toasts shown at once.          |

All other sonner `Toaster` props pass through. `toast` is sonner's `toast`
(`toast.success` / `.error` / `.promise`, …).

## Accessibility

sonner renders its own `aria-live` region, so announcements work with no extra
wiring. Keep toast messages short and meaningful; do not use a toast as the sole
carrier of information a user must act on.
