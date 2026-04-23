import styled from 'styled-components';
import type { MessageDeliveryStatus } from '../types';

const ReceiptWrapper = styled.span<{ $isOwn: boolean }>`
  display: inline-flex;
  align-items: center;
  margin-left: 0.25rem;
  font-size: 0.7rem;
  color: ${(props) => (props.$isOwn ? 'rgba(255, 255, 255, 0.85)' : props.theme.text.secondary)};
  user-select: none;
`;

const CheckIcon = styled.span<{ $filled: boolean; $isOwn: boolean }>`
  font-size: 0.75rem;
  color: ${(props) =>
    props.$filled
      ? props.$isOwn
        ? 'rgba(255, 255, 255, 0.95)'
        : props.theme.colors.primary[500]
      : props.$isOwn
        ? 'rgba(255, 255, 255, 0.6)'
        : props.theme.text.tertiary};
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
    <ReceiptWrapper $isOwn={isOwn} aria-label={label} title={label}>
      <CheckIcon $filled={filled} $isOwn={isOwn}>
        {icon}
      </CheckIcon>
      {status === 'read' && readCount !== undefined && readCount > 1 && (
        <span style={{ marginLeft: '0.125rem', fontSize: '0.625rem' }}>{readCount}</span>
      )}
    </ReceiptWrapper>
  );
}
