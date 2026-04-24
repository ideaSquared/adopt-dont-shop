import styled from 'styled-components';
import type { MessageDeliveryStatus } from '../types';

/**
 * Read receipts live in the message meta row below the bubble (not inside
 * a colored bubble anymore), so colors here are tuned for a neutral
 * background. $filled messages (read/delivered) pick up the primary
 * accent; everything else stays subtle via theme.text.tertiary.
 */
const ReceiptWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 0.125rem;
  font-size: 0.7rem;
  color: ${(props) => props.theme.text.tertiary};
  user-select: none;
`;

const CheckIcon = styled.span<{ $filled: boolean }>`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${(props) =>
    props.$filled ? props.theme.colors.primary[500] : props.theme.text.tertiary};
`;

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
    <ReceiptWrapper aria-label={label} title={label}>
      <CheckIcon $filled={filled}>{icon}</CheckIcon>
      {status === 'read' && readCount !== undefined && readCount > 1 && (
        <span style={{ marginLeft: '0.125rem', fontSize: '0.625rem' }}>{readCount}</span>
      )}
    </ReceiptWrapper>
  );
}
