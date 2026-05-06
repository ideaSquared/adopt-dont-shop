/**
 * Thin wrapper that adapts app.rescue's dependencies onto lib.chat's
 * ChatProvider. All chat state and behavior now lives in @adopt-dont-shop/lib.chat.
 *
 * Historically rescue had a forked, 328-line ChatContext that was missing
 * features present in app.client (markAsRead, startConversation, pagination,
 * offline queueing, unread aggregation) and also had a Socket.IO auth bug
 * (reading localStorage directly instead of via authService.getToken). This
 * adapter brings rescue to feature parity by consuming the same lib.chat
 * provider as app.client.
 */

import { useMemo, type ReactNode } from 'react';
import {
  ChatProvider as LibChatProvider,
  useChat as useLibChat,
  type ChatContextValue,
} from '@adopt-dont-shop/lib.chat';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { authService, chatService } from '../services/libraryServices';
import { resolveFileUrl } from '../utils/fileUtils';

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const tokenProvider = useMemo(() => () => authService.getToken(), []);

  const chatUser = user
    ? {
        userId: user.userId,
        firstName: user.firstName,
        // Drives the staff-badge / rescue-branding logic in MessageItem.
        // Empty / undefined rescueId means the viewer is treated as an
        // adopter and rescue-staff messages render under the rescue's
        // public name.
        rescueId: user.rescueId ?? undefined,
      }
    : null;

  return (
    <LibChatProvider
      chatService={chatService}
      user={chatUser}
      isAuthenticated={isAuthenticated}
      tokenProvider={tokenProvider}
      resolveFileUrl={resolveFileUrl}
    >
      {children}
    </LibChatProvider>
  );
}

export const useChat = useLibChat;

export type ChatContextType = ChatContextValue;
