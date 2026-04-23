import styled, { keyframes } from 'styled-components';
import { useChat } from '../context/use-chat';

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
  background: ${(props) => {
    switch (props.variant) {
      case 'warning':
        return props.theme.colors.semantic.warning[500];
      case 'error':
        return props.theme.colors.semantic.error[500];
      case 'info':
      default:
        return props.theme.colors.primary[500];
    }
  }};
  color: ${(props) => props.theme.text.inverse};
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
  /* Lighter shade of the banner color for the dot — tracks the theme
     automatically instead of hardcoding pastel hex values. */
  background: ${(props) => {
    switch (props.variant) {
      case 'warning':
        return props.theme.colors.semantic.warning[100];
      case 'error':
        return props.theme.colors.semantic.error[100];
      case 'info':
      default:
        return props.theme.colors.primary[100];
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
    <Banner variant={variant}>
      <StatusDot variant={variant} />
      <StatusText>{message}</StatusText>
    </Banner>
  );
}
