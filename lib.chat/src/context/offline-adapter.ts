/**
 * Connection quality classification reported by the offline adapter.
 */
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

export type PendingMessage = {
  id: string;
  conversationId: string;
  content: string;
};

export type PendingAction = {
  id: string;
  type: 'mark_read' | 'typing_start' | 'typing_stop';
  conversationId: string;
};

export type OfflineState = {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  pendingMessages: ReadonlyArray<PendingMessage>;
  pendingActions: ReadonlyArray<PendingAction>;
};

export type OfflineStateListener = (state: OfflineState) => void;

export type OfflineSyncCallback = (
  messages: ReadonlyArray<PendingMessage>,
  actions: ReadonlyArray<PendingAction>
) => Promise<void>;

/**
 * Optional adapter the ChatProvider uses when the host app wants richer offline
 * support (queueing messages when the browser is offline, syncing on reconnect,
 * connection-quality reporting). Apps that don't need these behaviors can omit
 * the adapter and the provider will degrade to `navigator.onLine`.
 */
export type OfflineAdapter = {
  isCurrentlyOnline: () => boolean;
  getConnectionQuality: () => ConnectionQuality;
  onOfflineStateChange: (listener: OfflineStateListener) => void;
  removeOfflineStateListener: (listener: OfflineStateListener) => void;
  queueMessageForOffline: (conversationId: string, content: string) => string;
  forceSync: () => Promise<void>;
  setSyncCallback: (callback: OfflineSyncCallback) => void;
  removeQueuedMessage: (id: string) => void;
  removeQueuedAction: (id: string) => void;
};
