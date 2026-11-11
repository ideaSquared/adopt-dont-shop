/**
 * Offline Manager for Chat System
 * Handles offline message queuing, connection monitoring, and sync capabilities
 */

import { toast } from '@adopt-dont-shop/lib.components';

/** A queued item is dropped after this many failed sync attempts. */
export const MAX_SYNC_ATTEMPTS = 5;
/** A queued item is dropped once it is older than this. */
export const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;

const MESSAGES_KEY = 'offline_pending_messages';
const ACTIONS_KEY = 'offline_pending_actions';

export interface QueuedMessage {
  id: string;
  /** Owner of the item. Items without one (legacy format) are discarded on load. */
  userId: string;
  attempts: number;
  conversationId: string;
  content: string;
  messageType: string;
  timestamp: number;
}

export interface QueuedAction {
  id: string;
  userId: string;
  attempts: number;
  type: 'mark_read' | 'typing_start' | 'typing_stop';
  conversationId: string;
  timestamp: number;
}

export interface OfflineState {
  isOnline: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  pendingMessages: QueuedMessage[];
  pendingActions: QueuedAction[];
}

/**
 * `isStillCurrent` turns false as soon as the signed-in user changes. A callback that issues one
 * request per item must check it immediately before each request and stop once it is false.
 */
type SyncCallback = (
  messages: QueuedMessage[],
  actions: QueuedAction[],
  isStillCurrent: () => boolean
) => Promise<void>;
type OfflineStateChangeListener = (state: OfflineState) => void;

class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private connectionQuality: 'good' | 'poor' | 'offline' = 'good';
  private pendingMessages: QueuedMessage[] = [];
  private pendingActions: QueuedAction[] = [];
  private currentUserId: string | null = null;
  // Bumped whenever the signed-in user changes, so a sync started for the previous user can tell.
  private identityGeneration = 0;
  private syncCallback: SyncCallback | null = null;
  private listeners: OfflineStateChangeListener[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  // Bound listener refs stored so removeEventListener can remove the same function reference.
  private readonly boundHandleOnline: () => void;
  private readonly boundHandleOffline: () => void;

  constructor() {
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);
    this.initializeNetworkListeners();
    this.loadPersistedData();
    this.startPeriodicSync();
  }

  private initializeNetworkListeners() {
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);
  }

  private handleOnline() {
    this.isOnline = true;
    this.connectionQuality = 'good';
    this.notifyListeners();
    this.trySync();
  }

  private handleOffline() {
    this.isOnline = false;
    this.connectionQuality = 'offline';
    this.notifyListeners();
  }

  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && (this.pendingMessages.length > 0 || this.pendingActions.length > 0)) {
        this.trySync();
      }
    }, 30000); // Sync every 30 seconds
  }

  private loadPersistedData() {
    try {
      const savedMessages = localStorage.getItem(MESSAGES_KEY);
      const savedActions = localStorage.getItem(ACTIONS_KEY);

      if (savedMessages) {
        this.pendingMessages = this.keepOwned(JSON.parse(savedMessages));
      }

      if (savedActions) {
        this.pendingActions = this.keepOwned(JSON.parse(savedActions));
      }
    } catch (error) {
      console.error('Failed to load persisted offline data:', error);
    }
  }

  // Legacy items (no userId) and malformed entries are discarded.
  private keepOwned<T extends { userId: string }>(items: unknown): T[] {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.filter(
      (item): item is T =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { userId?: unknown }).userId === 'string' &&
        (item as { userId: string }).userId.length > 0
    );
  }

  private persistData() {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(this.pendingMessages));
      localStorage.setItem(ACTIONS_KEY, JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to persist offline data:', error);
    }
  }

  private notifyListeners() {
    const state: OfflineState = {
      isOnline: this.isOnline,
      connectionQuality: this.connectionQuality,
      pendingMessages: [...this.pendingMessages],
      pendingActions: [...this.pendingActions],
    };

    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in offline state listener:', error);
      }
    });
  }

  private dropExpired() {
    const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
    const messages = this.pendingMessages.filter(m => m.timestamp >= cutoff);
    const actions = this.pendingActions.filter(a => a.timestamp >= cutoff);
    const droppedMessages = this.pendingMessages.length - messages.length;
    if (droppedMessages === 0 && actions.length === this.pendingActions.length) {
      return;
    }
    this.pendingMessages = messages;
    this.pendingActions = actions;
    this.persistData();
    this.notifyListeners();
    this.reportDroppedMessages(droppedMessages);
  }

  private reportDroppedMessages(count: number) {
    if (count > 0) {
      toast.error(`${count} queued message${count === 1 ? '' : 's'} could not be sent.`);
    }
  }

  // The sync callback removes items it delivered, so anything from the snapshot
  // that is still queued failed this round.
  private recordFailedAttempts(messages: QueuedMessage[], actions: QueuedAction[]) {
    const failedMessageIds = new Set(
      messages.filter(m => this.pendingMessages.some(p => p.id === m.id)).map(m => m.id)
    );
    const failedActionIds = new Set(
      actions.filter(a => this.pendingActions.some(p => p.id === a.id)).map(a => a.id)
    );
    if (failedMessageIds.size === 0 && failedActionIds.size === 0) {
      return;
    }
    const bump = <T extends { id: string; attempts: number }>(items: T[], ids: Set<string>) =>
      items
        .map(item => (ids.has(item.id) ? { ...item, attempts: item.attempts + 1 } : item))
        .filter(item => item.attempts < MAX_SYNC_ATTEMPTS);
    const before = this.pendingMessages.length;
    this.pendingMessages = bump(this.pendingMessages, failedMessageIds);
    this.pendingActions = bump(this.pendingActions, failedActionIds);
    this.persistData();
    this.notifyListeners();
    this.reportDroppedMessages(before - this.pendingMessages.length);
  }

  private async trySync() {
    if (!this.currentUserId || !this.syncCallback) {
      return;
    }
    const generation = this.identityGeneration;
    const isStillCurrent = () => this.identityGeneration === generation;
    this.dropExpired();
    if (!this.pendingMessages.length && !this.pendingActions.length) {
      return;
    }

    const messages = [...this.pendingMessages];
    const actions = [...this.pendingActions];
    try {
      await this.syncCallback(messages, actions, isStillCurrent);
    } catch (error) {
      console.error('Sync failed:', error);
    }
    if (isStillCurrent()) {
      this.recordFailedAttempts(messages, actions);
    }
  }

  // Public API
  setSyncCallback(callback: SyncCallback | null) {
    this.syncCallback = callback;
  }

  /**
   * Scope the queues to the signed-in user. Items owned by anyone else are
   * discarded; pass null when signed out to clear everything.
   */
  setCurrentUser(userId: string | null) {
    if (userId !== this.currentUserId) {
      this.identityGeneration += 1;
    }
    this.currentUserId = userId;
    this.pendingMessages = this.pendingMessages.filter(m => m.userId === userId);
    this.pendingActions = this.pendingActions.filter(a => a.userId === userId);
    this.persistData();
    this.notifyListeners();
    if (userId) {
      this.dropExpired();
    }
  }

  clearQueues() {
    this.setCurrentUser(null);
  }

  queueMessage(conversationId: string, content: string, messageType: string = 'text'): string {
    const id = `offline_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!this.currentUserId) {
      return id; // Nobody to own the message; never persist it.
    }
    const message: QueuedMessage = {
      id,
      userId: this.currentUserId,
      attempts: 0,
      conversationId,
      content,
      messageType,
      timestamp: Date.now(),
    };

    this.pendingMessages.push(message);
    this.persistData();
    this.notifyListeners();

    return id;
  }

  queueAction(type: QueuedAction['type'], conversationId: string): string {
    const id = `offline_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!this.currentUserId) {
      return id;
    }
    const action: QueuedAction = {
      id,
      userId: this.currentUserId,
      attempts: 0,
      type,
      conversationId,
      timestamp: Date.now(),
    };

    this.pendingActions.push(action);
    this.persistData();
    this.notifyListeners();

    return id;
  }

  removeQueuedMessage(messageId: string) {
    this.pendingMessages = this.pendingMessages.filter(msg => msg.id !== messageId);
    this.persistData();
    this.notifyListeners();
  }

  removeQueuedAction(actionId: string) {
    this.pendingActions = this.pendingActions.filter(action => action.id !== actionId);
    this.persistData();
    this.notifyListeners();
  }

  async forceSync() {
    if (this.isOnline) {
      await this.trySync();
    }
  }

  onStateChange(listener: OfflineStateChangeListener) {
    this.listeners.push(listener);
    // Immediately notify with current state
    this.notifyListeners();
  }

  removeStateListener(listener: OfflineStateChangeListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  getCurrentState(): OfflineState {
    return {
      isOnline: this.isOnline,
      connectionQuality: this.connectionQuality,
      pendingMessages: [...this.pendingMessages],
      pendingActions: [...this.pendingActions],
    };
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Convenience functions for the expected interface
export const isCurrentlyOnline = () => offlineManager.getCurrentState().isOnline;

export const getConnectionQuality = () => offlineManager.getCurrentState().connectionQuality;

export const queueMessageForOffline = (conversationId: string, content: string) =>
  offlineManager.queueMessage(conversationId, content);

export const onOfflineStateChange = (listener: OfflineStateChangeListener) =>
  offlineManager.onStateChange(listener);

export const removeOfflineStateListener = (listener: OfflineStateChangeListener) =>
  offlineManager.removeStateListener(listener);
