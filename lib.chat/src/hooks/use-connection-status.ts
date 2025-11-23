import { useEffect, useState } from 'react';
import { ChatService } from '../services/chat-service';
import { ConnectionStatus } from '../types';

/**
 * Hook for tracking Socket.IO connection status
 *
 * @example
 * ```tsx
 * const { status, isConnected, isReconnecting, reconnectionAttempts } = useConnectionStatus(chatService);
 *
 * if (isReconnecting) {
 *   return <Banner>Reconnecting... (attempt {reconnectionAttempts})</Banner>;
 * }
 * ```
 */
export const useConnectionStatus = (chatService: ChatService) => {
  const [status, setStatus] = useState<ConnectionStatus>(
    chatService.getConnectionStatus()
  );
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);

  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      setReconnectionAttempts(chatService.getReconnectionAttempts());
    };

    chatService.onConnectionStatusChange(handleStatusChange);

    // Set initial status
    setStatus(chatService.getConnectionStatus());
    setReconnectionAttempts(chatService.getReconnectionAttempts());

    return () => {
      chatService.offConnectionStatusChange(handleStatusChange);
    };
  }, [chatService]);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error',
    reconnectionAttempts,
  };
};
