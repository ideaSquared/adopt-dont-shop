/**
 * Thin wrapper that adapts app.client's dependencies onto lib.chat's
 * ChatProvider. All chat state and behavior now lives in @adopt-dont-shop/lib.chat;
 * this file exists only to inject the app's chatService, authService, useAuth,
 * and offlineManager.
 */

import { useMemo, type ReactNode } from 'react';
import {
  ChatProvider as LibChatProvider,
  useChat as useLibChat,
  type ChatContextValue,
  type OfflineAdapter,
  type OfflineState,
  type OfflineStateListener,
  type OfflineSyncCallback,
  type ConnectionQuality,
} from '@adopt-dont-shop/lib.chat';
import {
  authService,
  chatService,
  type Conversation as LibConversation,
  type Message as LibMessage,
} from '@/services';
import {
  getConnectionQuality,
  isCurrentlyOnline,
  offlineManager,
  onOfflineStateChange,
  queueMessageForOffline,
  removeOfflineStateListener,
  type OfflineState as AppOfflineState,
} from '@/utils/offlineManager';
import { useAuth } from '@adopt-dont-shop/lib.auth';

const toLibOfflineState = (state: AppOfflineState): OfflineState => ({
  isOnline: state.isOnline,
  connectionQuality: state.connectionQuality as ConnectionQuality,
  pendingMessages: state.pendingMessages.map(m => ({
    id: m.id,
    conversationId: m.conversationId,
    content: m.content,
  })),
  pendingActions: state.pendingActions.map(a => ({
    id: a.id,
    type: a.type,
    conversationId: a.conversationId,
  })),
});

const buildOfflineAdapter = (): OfflineAdapter => {
  const listenerMap = new WeakMap<OfflineStateListener, (state: AppOfflineState) => void>();
  return {
    isCurrentlyOnline,
    getConnectionQuality: () => getConnectionQuality() as ConnectionQuality,
    onOfflineStateChange: (listener: OfflineStateListener) => {
      const wrapped = (state: AppOfflineState) => listener(toLibOfflineState(state));
      listenerMap.set(listener, wrapped);
      onOfflineStateChange(wrapped);
    },
    removeOfflineStateListener: (listener: OfflineStateListener) => {
      const wrapped = listenerMap.get(listener);
      if (wrapped) {
        removeOfflineStateListener(wrapped);
        listenerMap.delete(listener);
      }
    },
    queueMessageForOffline,
    forceSync: () => offlineManager.forceSync(),
    setSyncCallback: (callback: OfflineSyncCallback) => {
      offlineManager.setSyncCallback(async (messages, actions) =>
        callback(
          messages.map(m => ({ id: m.id, conversationId: m.conversationId, content: m.content })),
          actions.map(a => ({ id: a.id, type: a.type, conversationId: a.conversationId }))
        )
      );
    },
    removeQueuedMessage: (id: string) => offlineManager.removeQueuedMessage(id),
    removeQueuedAction: (id: string) => offlineManager.removeQueuedAction(id),
  };
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const offlineAdapter = useMemo(() => buildOfflineAdapter(), []);
  const tokenProvider = useMemo(() => () => authService.getToken(), []);

  const chatUser = user ? { userId: user.userId, firstName: user.firstName } : null;

  return (
    <LibChatProvider
      chatService={chatService}
      user={chatUser}
      isAuthenticated={isAuthenticated}
      tokenProvider={tokenProvider}
      offlineAdapter={offlineAdapter}
    >
      {children}
    </LibChatProvider>
  );
}

export const useChat = useLibChat;

// Re-exports so downstream components using `@/contexts/ChatContext` keep working.
export type ChatContextType = ChatContextValue;
export type Conversation = LibConversation;
export type Message = LibMessage;
