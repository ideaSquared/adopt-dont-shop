/**
 * Offline handling utility for chat system
 * Manages network state, message queuing, and reconnection logic
 */

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueuedAction {
  id: string;
  type: 'mark_read' | 'typing_start' | 'typing_stop';
  conversationId: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  payload?: Record<string, unknown>;
}

export interface OfflineState {
  isOnline: boolean;
  lastOnline: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  pendingMessages: QueuedMessage[];
  pendingActions: QueuedAction[];
  syncInProgress: boolean;
}

class OfflineManager {
  private state: OfflineState = {
    isOnline: navigator.onLine,
    lastOnline: Date.now(),
    connectionQuality: 'excellent',
    pendingMessages: [],
    pendingActions: [],
    syncInProgress: false,
  };

  private listeners: Array<(state: OfflineState) => void> = [];
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private syncCallback?: (messages: QueuedMessage[], actions: QueuedAction[]) => Promise<void>;

  constructor() {
    this.setupEventListeners();
    this.startConnectionMonitoring();
    this.loadPersistedData();
  }

  // Set up online/offline event listeners
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Also listen for visibility change to check connection when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.isOnline) {
        this.checkConnectionQuality();
      }
    });
  }

  // Start monitoring connection quality
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      if (this.state.isOnline) {
        this.checkConnectionQuality();
      }
    }, 30000); // Check every 30 seconds
  }

  // Check connection quality by measuring response time
  private async checkConnectionQuality(): Promise<void> {
    try {
      const startTime = Date.now();
      // Use the same API base URL as the rest of the app to avoid calling localhost:3000
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const healthUrl = `${apiBaseUrl}/api/v1/health/simple`;

      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const responseTime = Date.now() - startTime;
        let quality: OfflineState['connectionQuality'] = 'excellent';

        if (responseTime > 2000) {
          quality = 'poor';
        } else if (responseTime > 1000) {
          quality = 'good';
        }

        this.updateState({ connectionQuality: quality });
      }
    } catch (error) {
      // If health check fails, connection might be poor or offline
      this.updateState({ connectionQuality: 'poor' });

      // Double-check if we're actually offline
      if (!navigator.onLine) {
        this.handleOffline();
      }
    }
  }

  // Handle going online
  private handleOnline(): void {
    this.updateState({
      isOnline: true,
      lastOnline: Date.now(),
      connectionQuality: 'good', // Will be updated by connection check
    });

    // Start syncing when connection is restored
    this.syncPendingData();

    // Check connection quality
    this.checkConnectionQuality();
  }

  // Handle going offline
  private handleOffline(): void {
    this.updateState({
      isOnline: false,
      connectionQuality: 'offline',
    });
  }

  // Update state and notify listeners
  private updateState(updates: Partial<OfflineState>): void {
    this.state = { ...this.state, ...updates };
    this.persistState();
    this.notifyListeners();
  }

  // Add listener for state changes
  addListener(listener: (state: OfflineState) => void): void {
    this.listeners.push(listener);
  }

  // Remove listener
  removeListener(listener: (state: OfflineState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in offline state listener:', error);
      }
    });
  }

  // Set sync callback for handling queued data
  setSyncCallback(
    callback: (messages: QueuedMessage[], actions: QueuedAction[]) => Promise<void>
  ): void {
    this.syncCallback = callback;
  }

  // Queue a message for offline sending
  queueMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    maxRetries = 3
  ): string {
    const queuedMessage: QueuedMessage = {
      id: `offline_${Date.now()}_${Math.random()}`,
      conversationId,
      content,
      messageType,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.updateState({
      pendingMessages: [...this.state.pendingMessages, queuedMessage],
    });

    return queuedMessage.id;
  }

  // Queue an action for offline execution
  queueAction(
    type: QueuedAction['type'],
    conversationId: string,
    payload?: Record<string, unknown>,
    maxRetries = 3
  ): string {
    const queuedAction: QueuedAction = {
      id: `action_${Date.now()}_${Math.random()}`,
      type,
      conversationId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      payload,
    };

    this.updateState({
      pendingActions: [...this.state.pendingActions, queuedAction],
    });

    return queuedAction.id;
  }

  // Remove a queued message
  removeQueuedMessage(messageId: string): void {
    this.updateState({
      pendingMessages: this.state.pendingMessages.filter(m => m.id !== messageId),
    });
  }

  // Remove a queued action
  removeQueuedAction(actionId: string): void {
    this.updateState({
      pendingActions: this.state.pendingActions.filter(a => a.id !== actionId),
    });
  }

  // Sync all pending data when connection is restored
  private async syncPendingData(): Promise<void> {
    if (this.state.syncInProgress || !this.state.isOnline || !this.syncCallback) {
      return;
    }

    this.updateState({ syncInProgress: true });

    try {
      // Sort messages by timestamp to maintain order
      const messagesToSync = [...this.state.pendingMessages].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Sort actions by timestamp
      const actionsToSync = [...this.state.pendingActions].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      if (messagesToSync.length > 0 || actionsToSync.length > 0) {
        await this.syncCallback(messagesToSync, actionsToSync);
      }
    } catch (error) {
      console.error('Failed to sync pending data:', error);

      // Increment retry count for failed items
      this.updateState({
        pendingMessages: this.state.pendingMessages.map(msg => ({
          ...msg,
          retryCount: msg.retryCount + 1,
        })),
        pendingActions: this.state.pendingActions.map(action => ({
          ...action,
          retryCount: action.retryCount + 1,
        })),
      });

      // Remove items that have exceeded max retries
      this.cleanupFailedItems();
    } finally {
      this.updateState({ syncInProgress: false });
    }
  }

  // Remove items that have exceeded their retry limits
  private cleanupFailedItems(): void {
    const validMessages = this.state.pendingMessages.filter(msg => msg.retryCount < msg.maxRetries);
    const validActions = this.state.pendingActions.filter(
      action => action.retryCount < action.maxRetries
    );

    this.updateState({
      pendingMessages: validMessages,
      pendingActions: validActions,
    });
  }

  // Get current offline state
  getState(): OfflineState {
    return { ...this.state };
  }

  // Check if currently online
  isOnline(): boolean {
    return this.state.isOnline;
  }

  // Get connection quality
  getConnectionQuality(): OfflineState['connectionQuality'] {
    return this.state.connectionQuality;
  }

  // Get count of pending items
  getPendingCount(): { messages: number; actions: number } {
    return {
      messages: this.state.pendingMessages.length,
      actions: this.state.pendingActions.length,
    };
  }

  // Persist state to localStorage
  private persistState(): void {
    try {
      const dataToStore = {
        pendingMessages: this.state.pendingMessages,
        pendingActions: this.state.pendingActions,
        lastOnline: this.state.lastOnline,
      };
      localStorage.setItem('chat_offline_state', JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to persist offline state:', error);
    }
  }

  // Load persisted state from localStorage
  private loadPersistedData(): void {
    try {
      const stored = localStorage.getItem('chat_offline_state');
      if (stored) {
        const data = JSON.parse(stored);
        this.updateState({
          pendingMessages: data.pendingMessages || [],
          pendingActions: data.pendingActions || [],
          lastOnline: data.lastOnline || Date.now(),
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted offline state:', error);
    }
  }

  // Clear all pending data (for testing or manual cleanup)
  clearPendingData(): void {
    this.updateState({
      pendingMessages: [],
      pendingActions: [],
    });
  }

  // Manually trigger sync (useful for testing or manual retry)
  async forceSync(): Promise<void> {
    if (this.state.isOnline) {
      await this.syncPendingData();
    }
  }

  // Clean up resources
  destroy(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    this.listeners = [];
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Helper functions for easier usage
export const queueMessageForOffline = (
  conversationId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' = 'text'
): string => {
  return offlineManager.queueMessage(conversationId, content, messageType);
};

export const queueActionForOffline = (
  type: QueuedAction['type'],
  conversationId: string,
  payload?: Record<string, unknown>
): string => {
  return offlineManager.queueAction(type, conversationId, payload);
};

export const isCurrentlyOnline = (): boolean => {
  return offlineManager.isOnline();
};

export const getConnectionQuality = (): OfflineState['connectionQuality'] => {
  return offlineManager.getConnectionQuality();
};

export const onOfflineStateChange = (callback: (state: OfflineState) => void): void => {
  offlineManager.addListener(callback);
};

export const removeOfflineStateListener = (callback: (state: OfflineState) => void): void => {
  offlineManager.removeListener(callback);
};
