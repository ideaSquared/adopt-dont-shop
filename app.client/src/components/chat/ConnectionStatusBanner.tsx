import { useChat } from '@/contexts/ChatContext';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const Banner = styled.div<{ variant: 'info' | 'warning' | 'error' }>`
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: ${props => {
    switch (props.variant) {
      case 'warning':
        return props.theme.colors.semantic.warning?.[500] || '#f59e0b';
      case 'error':
        return props.theme.colors.semantic.error[500] || '#ef4444';
      case 'info':
      default:
        return props.theme.colors.primary[500] || '#3b82f6';
    }
  }};
  color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  animation: ${pulse} 2s ease-in-out infinite;

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.813rem;
  }
`;

const StatusDot = styled.span<{ variant: 'info' | 'warning' | 'error' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.variant) {
      case 'warning':
        return '#fef3c7';
      case 'error':
        return '#fecaca';
      case 'info':
      default:
        return '#dbeafe';
    }
  }};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const StatusText = styled.span`
  flex: 1;
  text-align: center;
`;

export function ConnectionStatusBanner() {
  const { connectionStatus, reconnectionAttempts } = useChat();

  // Don't show banner if connected
  if (connectionStatus === 'connected') {
    return null;
  }

  // Determine banner variant and message
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
    <Banner variant={variant}>
      <StatusDot variant={variant} />
      <StatusText>{message}</StatusText>
    </Banner>
  );
}
