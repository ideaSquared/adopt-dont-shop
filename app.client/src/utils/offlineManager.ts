/**
 * Offline Manager for Chat System
 * Handles offline message queuing, connection monitoring, and sync capabilities
 */

import { api } from '@/services/api';

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  messageType: string;
  timestamp: number;
}

export interface QueuedAction {
  id: string;
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

type SyncCallback = (messages: QueuedMessage[], actions: QueuedAction[]) => Promise<void>;
type OfflineStateChangeListener = (state: OfflineState) => void;

class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private connectionQuality: 'good' | 'poor' | 'offline' = 'good';
  private pendingMessages: QueuedMessage[] = [];
  private pendingActions: QueuedAction[] = [];
  private syncCallback: SyncCallback | null = null;
  private listeners: OfflineStateChangeListener[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures: number = 0;

  constructor() {
    this.initializeNetworkListeners();
    this.loadPersistedData();
    this.startPeriodicSync();
    this.startConnectionQualityCheck();
  }

  private initializeNetworkListeners() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
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

  private startConnectionQualityCheck() {
    // Do an initial check after a short delay
    setTimeout(() => this.checkConnectionQuality(), 2000);

    // Check every 2 minutes in development to reduce log noise, or 30 seconds in production
    const isDev =
      process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    const interval = isDev ? 120000 : 30000; // 2 minutes for dev, 30 seconds for prod

    this.connectionCheckInterval = setInterval(() => {
      this.checkConnectionQuality();
    }, interval);
  }

  private async checkConnectionQuality() {
    if (!this.isOnline) {
      this.connectionQuality = 'offline';
      return;
    }

    try {
      const startTime = Date.now();
      // Use the same API base URL as the rest of the app to avoid calling localhost:3000
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const healthUrl = `${apiBaseUrl}/api/v1/health/simple`;

      // Use the simple health endpoint for quick connection quality checks
      await api.fetch('/api/v1/health/simple', {
        method: 'GET',
        timeout: 3000, // Reduced timeout to 3 seconds
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // If we got here without throwing, the response was successful
      this.connectionQuality = latency < 1000 ? 'good' : 'poor';
      this.consecutiveFailures = 0; // Reset on success
    } catch (error) {
      this.consecutiveFailures++;
      // Only log connection errors occasionally to avoid spam
      if (this.connectionQuality !== 'poor' && this.consecutiveFailures <= 3) {
        console.warn('Health check failed, marking connection as poor:', error);
      }
      this.connectionQuality = 'poor';

      // If there are 5 consecutive failures, back off the check interval to every 2 minutes
      if (this.consecutiveFailures >= 5) {
        clearInterval(this.connectionCheckInterval!);
        this.connectionCheckInterval = setInterval(() => {
          this.checkConnectionQuality();
        }, 120000); // 2 minutes
      }
    }

    this.notifyListeners();
  }

  private loadPersistedData() {
    try {
      const savedMessages = localStorage.getItem('offline_pending_messages');
      const savedActions = localStorage.getItem('offline_pending_actions');

      if (savedMessages) {
        this.pendingMessages = JSON.parse(savedMessages);
      }

      if (savedActions) {
        this.pendingActions = JSON.parse(savedActions);
      }
    } catch (error) {
      console.error('Failed to load persisted offline data:', error);
    }
  }

  private persistData() {
    try {
      localStorage.setItem('offline_pending_messages', JSON.stringify(this.pendingMessages));
      localStorage.setItem('offline_pending_actions', JSON.stringify(this.pendingActions));
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

  private async trySync() {
    if (!this.syncCallback || (!this.pendingMessages.length && !this.pendingActions.length)) {
      return;
    }

    try {
      await this.syncCallback([...this.pendingMessages], [...this.pendingActions]);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Public API
  setSyncCallback(callback: SyncCallback) {
    this.syncCallback = callback;
  }

  queueMessage(conversationId: string, content: string, messageType: string = 'text'): string {
    const id = `offline_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: QueuedMessage = {
      id,
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
    const action: QueuedAction = {
      id,
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
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
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
