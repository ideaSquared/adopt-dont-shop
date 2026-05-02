import { useChat } from '../context/use-chat';
import * as styles from './ConnectionStatusBanner.css';

export function ConnectionStatusBanner() {
  const { connectionStatus, reconnectionAttempts } = useChat();

  if (connectionStatus === 'connected') {
    return null;
  }

  let variant: 'info' | 'warning' | 'error' = 'info';
  let message = '';

  switch (connectionStatus) {
    case 'connecting':
      variant = 'info';
      message = 'Connecting to chat...';
      break;
    case 'reconnecting':
      variant = 'warning';
      message = `Reconnecting to chat... (attempt ${reconnectionAttempts})`;
      break;
    case 'error':
      variant = 'error';
      message =
        reconnectionAttempts > 0
          ? `Connection error. Retrying... (attempt ${reconnectionAttempts})`
          : 'Connection error. Please check your internet connection.';
      break;
    case 'disconnected':
      variant = 'warning';
      message = 'Disconnected from chat';
      break;
    default:
      return null;
  }

  return (
    <div className={styles.banner[variant]}>
      <span className={styles.statusDot[variant]} />
      <span className={styles.statusText}>{message}</span>
    </div>
  );
}
