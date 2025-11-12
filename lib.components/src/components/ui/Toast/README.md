# Toast Component

A notification system component that displays temporary messages to users with smooth animations and auto-dismiss functionality.

## Usage

```tsx
import { Toast, ToastContainer } from '@lib/components';
import { useToast } from '@lib/components/hooks';

function MyApp() {
  const { toasts, showToast, hideToast } = useToast();

  const handleShowToast = () => {
    showToast('Operation completed successfully!', 'success');
  };

  return (
    <div>
      <button onClick={handleShowToast}>Show Toast</button>

      <ToastContainer position='top-right'>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={hideToast} />
        ))}
      </ToastContainer>
    </div>
  );
}
```

## Toast Props

| Prop        | Type                                          | Default       | Description                                |
| ----------- | --------------------------------------------- | ------------- | ------------------------------------------ |
| `id`        | `string`                                      | -             | Unique identifier for the toast (required) |
| `message`   | `string`                                      | -             | Message to display (required)              |
| `type`      | `'success' \| 'error' \| 'warning' \| 'info'` | -             | Type of notification (required)            |
| `duration`  | `number`                                      | -             | Auto-dismiss duration in ms                |
| `position`  | `ToastPosition`                               | `'top-right'` | Position on screen                         |
| `onClose`   | `(id: string) => void`                        | -             | Callback when toast is closed              |
| `autoClose` | `boolean`                                     | `true`        | Whether to auto-dismiss                    |

## ToastContainer Props

| Prop       | Type              | Default       | Description             |
| ---------- | ----------------- | ------------- | ----------------------- |
| `position` | `ToastPosition`   | `'top-right'` | Position for all toasts |
| `children` | `React.ReactNode` | -             | Toast components        |

## Toast Positions

```tsx
type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
```

## Features

- **Multiple Types**: Success, error, warning, and info toasts with appropriate icons
- **Auto-dismiss**: Configurable auto-dismiss with custom duration
- **Positioning**: 6 different screen positions
- **Animations**: Smooth slide-in/slide-out animations based on position
- **Stacking**: Multiple toasts stack appropriately
- **Accessibility**: Full keyboard and screen reader support

## Examples

### Basic Usage with useToast Hook

```tsx
function NotificationExample() {
  const { toasts, showToast, hideToast, clearToasts } = useToast();

  return (
    <>
      <div>
        <button onClick={() => showToast('Success!', 'success')}>Success Toast</button>
        <button onClick={() => showToast('Error occurred', 'error')}>Error Toast</button>
        <button onClick={() => showToast('Warning message', 'warning')}>Warning Toast</button>
        <button onClick={() => showToast('Info message', 'info')}>Info Toast</button>
        <button onClick={clearToasts}>Clear All</button>
      </div>

      <ToastContainer position='top-right'>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={hideToast} />
        ))}
      </ToastContainer>
    </>
  );
}
```

### Manual Toast Usage

```tsx
function ManualToastExample() {
  const [showManualToast, setShowManualToast] = useState(false);

  return (
    <>
      <button onClick={() => setShowManualToast(true)}>Show Manual Toast</button>

      {showManualToast && (
        <ToastContainer position='bottom-center'>
          <Toast
            id='manual-toast'
            message='This is a manual toast'
            type='info'
            duration={3000}
            onClose={() => setShowManualToast(false)}
          />
        </ToastContainer>
      )}
    </>
  );
}
```

### Different Positions

```tsx
function PositionExample() {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Top left', 'info')}>Top Left</button>
      <button onClick={() => showToast('Top center', 'info')}>Top Center</button>
      <button onClick={() => showToast('Top right', 'info')}>Top Right</button>
      <button onClick={() => showToast('Bottom left', 'info')}>Bottom Left</button>
      <button onClick={() => showToast('Bottom center', 'info')}>Bottom Center</button>
      <button onClick={() => showToast('Bottom right', 'info')}>Bottom Right</button>
    </div>
  );
}
```

### Persistent Toast (No Auto-dismiss)

```tsx
<Toast
  id='persistent'
  message="This toast won't auto-dismiss"
  type='warning'
  autoClose={false}
  onClose={handleClose}
/>
```

### Custom Duration

```tsx
<Toast
  id='custom-duration'
  message='This toast dismisses in 10 seconds'
  type='success'
  duration={10000}
  onClose={handleClose}
/>
```

## Integration with useToast Hook

The Toast component works seamlessly with the provided `useToast` hook:

```tsx
import { useToast } from '@lib/components/hooks';

const { toasts, showToast, hideToast, clearToasts } = useToast();

// Show different types of toasts
showToast('Success message', 'success', 5000);
showToast('Error message', 'error');
showToast('Warning message', 'warning', 8000);
showToast('Info message', 'info');

// Hide specific toast
hideToast('toast-id');

// Clear all toasts
clearToasts();
```

## Accessibility

- Full keyboard navigation support
- Screen reader accessible with appropriate ARIA labels
- Focus management for close buttons
- Semantic icons for different message types
