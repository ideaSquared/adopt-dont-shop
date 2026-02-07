import { type Message } from '@adopt-dont-shop/lib.chat';
import styled from 'styled-components';

const ReceiptWrapper = styled.span<{ $isOwn: boolean }>`
  display: inline-flex;
  align-items: center;
  margin-left: 0.25rem;
  font-size: 0.7rem;
  color: ${props => (props.$isOwn ? 'rgba(255, 255, 255, 0.85)' : props.theme.text.secondary)};
  user-select: none;
`;

const CheckIcon = styled.span<{ $filled: boolean; $isOwn: boolean }>`
  font-size: 0.75rem;
  color: ${props =>
    props.$filled
      ? props.$isOwn
        ? 'rgba(255, 255, 255, 0.95)'
        : props.theme.colors.primary[500]
      : props.$isOwn
        ? 'rgba(255, 255, 255, 0.6)'
        : props.theme.text.tertiary};
`;

type ReadReceiptIndicatorProps = {
  status: Message['status'];
  isOwn: boolean;
  readCount?: number;
};

const statusIcons: Record<NonNullable<Message['status']>, { icon: string; filled: boolean; label: string }> = {
  sending: { icon: '\u25CB', filled: false, label: 'Sending' },
  sent: { icon: '\u2713', filled: false, label: 'Sent' },
  delivered: { icon: '\u2713\u2713', filled: false, label: 'Delivered' },
  read: { icon: '\u2713\u2713', filled: true, label: 'Read' },
  failed: { icon: '\u2717', filled: false, label: 'Failed to send' },
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
