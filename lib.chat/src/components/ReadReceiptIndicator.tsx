import type { MessageDeliveryStatus } from '../types';
import * as styles from './ReadReceiptIndicator.css';

type ReadReceiptIndicatorProps = {
  status: MessageDeliveryStatus;
  isOwn: boolean;
  readCount?: number;
};

const statusIcons: Record<MessageDeliveryStatus, { icon: string; filled: boolean; label: string }> =
  {
    sending: { icon: '○', filled: false, label: 'Sending' },
    sent: { icon: '✓', filled: false, label: 'Sent' },
    delivered: { icon: '✓✓', filled: false, label: 'Delivered' },
    read: { icon: '✓✓', filled: true, label: 'Read' },
    failed: { icon: '✗', filled: false, label: 'Failed to send' },
  };

export function ReadReceiptIndicator({ status, isOwn, readCount }: ReadReceiptIndicatorProps) {
  if (!isOwn) {
    return null;
  }

  const { icon, filled, label } = statusIcons[status];

  return (
    <span className={styles.receiptWrapper} aria-label={label} title={label}>
      <span className={styles.checkIcon[filled ? 'filled' : 'unfilled']}>{icon}</span>
      {status === 'read' && readCount !== undefined && readCount > 1 && (
        <span style={{ marginLeft: '0.125rem', fontSize: '0.625rem' }}>{readCount}</span>
      )}
    </span>
  );
}
