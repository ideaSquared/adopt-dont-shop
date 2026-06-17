/**
 * Behavioural tests for the offline manager.
 *
 * The chat system queues messages/actions while offline and replays them on
 * reconnect. We treat the manager as a black box and exercise its public API:
 * queueing, removing, persisting to localStorage, notifying state listeners,
 * and syncing via the registered callback. Timers are faked so the
 * periodically-scheduled work is deterministic and no real network or clocks
 * are involved.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const apiFetch = vi.fn();

vi.mock('@/services', () => ({
  api: {
    fetch: (...args: unknown[]) => apiFetch(...args),
  },
}));

// Fake timers must be active before the module's singleton constructor runs.
vi.useFakeTimers();

import {
  offlineManager,
  isCurrentlyOnline,
  getConnectionQuality,
  queueMessageForOffline,
  onOfflineStateChange,
  removeOfflineStateListener,
  type OfflineState,
} from './offlineManager';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.clear();
  offlineManager.setSyncCallback(null);
  // Drain any queue left over from a prior test by reading + removing.
  const state = offlineManager.getCurrentState();
  state.pendingMessages.forEach(m => offlineManager.removeQueuedMessage(m.id));
  state.pendingActions.forEach(a => offlineManager.removeQueuedAction(a.id));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('queueing messages', () => {
  it('queues a message and exposes it in the current state', () => {
    const id = offlineManager.queueMessage('conv-1', 'hello');

    const state = offlineManager.getCurrentState();
    expect(state.pendingMessages).toHaveLength(1);
    expect(state.pendingMessages[0]).toMatchObject({
      id,
      conversationId: 'conv-1',
      content: 'hello',
      messageType: 'text',
    });
  });

  it('persists queued messages to localStorage', () => {
    offlineManager.queueMessage('conv-1', 'persisted');

    const saved = JSON.parse(localStorage.getItem('offline_pending_messages') ?? '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].content).toBe('persisted');
  });

  it('removes a queued message by id', () => {
    const id = offlineManager.queueMessage('conv-1', 'bye');

    offlineManager.removeQueuedMessage(id);

    expect(offlineManager.getCurrentState().pendingMessages).toHaveLength(0);
  });
});

describe('queueing actions', () => {
  it('queues a typed action', () => {
    const id = offlineManager.queueAction('mark_read', 'conv-2');

    const state = offlineManager.getCurrentState();
    expect(state.pendingActions[0]).toMatchObject({
      id,
      type: 'mark_read',
      conversationId: 'conv-2',
    });
  });

  it('removes a queued action by id', () => {
    const id = offlineManager.queueAction('typing_start', 'conv-2');

    offlineManager.removeQueuedAction(id);

    expect(offlineManager.getCurrentState().pendingActions).toHaveLength(0);
  });
});

describe('state listeners', () => {
  it('notifies a listener immediately on subscribe with the current state', () => {
    const listener = vi.fn();

    onOfflineStateChange(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    const state = listener.mock.calls[0][0] as OfflineState;
    expect(state).toHaveProperty('isOnline');
    expect(state).toHaveProperty('connectionQuality');

    removeOfflineStateListener(listener);
  });

  it('notifies listeners when a message is queued', () => {
    const listener = vi.fn();
    onOfflineStateChange(listener);
    listener.mockClear();

    offlineManager.queueMessage('conv-3', 'ping');

    expect(listener).toHaveBeenCalledTimes(1);
    removeOfflineStateListener(listener);
  });

  it('stops notifying after the listener is removed', () => {
    const listener = vi.fn();
    onOfflineStateChange(listener);
    removeOfflineStateListener(listener);
    listener.mockClear();

    offlineManager.queueMessage('conv-3', 'ping');

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a throwing listener so others still receive state', () => {
    const bad = vi.fn(() => {
      throw new Error('listener boom');
    });
    const good = vi.fn();
    onOfflineStateChange(bad);
    onOfflineStateChange(good);
    good.mockClear();

    expect(() => offlineManager.queueMessage('conv-4', 'x')).not.toThrow();
    expect(good).toHaveBeenCalled();

    removeOfflineStateListener(bad);
    removeOfflineStateListener(good);
  });
});

describe('sync', () => {
  it('forceSync invokes the registered callback with the pending queue when online', async () => {
    const syncCallback = vi.fn().mockResolvedValue(undefined);
    offlineManager.setSyncCallback(syncCallback);
    offlineManager.queueMessage('conv-5', 'to-sync');

    await offlineManager.forceSync();

    expect(syncCallback).toHaveBeenCalledTimes(1);
    const [messages] = syncCallback.mock.calls[0];
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('to-sync');
  });

  it('does not throw when the sync callback rejects', async () => {
    offlineManager.setSyncCallback(vi.fn().mockRejectedValue(new Error('sync failed')));
    offlineManager.queueMessage('conv-6', 'fails');

    await expect(offlineManager.forceSync()).resolves.toBeUndefined();
  });

  it('does nothing when there is no registered callback', async () => {
    offlineManager.setSyncCallback(null);
    offlineManager.queueMessage('conv-7', 'orphan');

    await expect(offlineManager.forceSync()).resolves.toBeUndefined();
  });
});

describe('convenience helpers', () => {
  it('isCurrentlyOnline reflects the manager state', () => {
    expect(typeof isCurrentlyOnline()).toBe('boolean');
  });

  it('getConnectionQuality returns a known quality value', () => {
    expect(['good', 'poor', 'offline']).toContain(getConnectionQuality());
  });

  it('queueMessageForOffline queues a default text message', () => {
    const id = queueMessageForOffline('conv-8', 'helper');

    const queued = offlineManager.getCurrentState().pendingMessages.find(m => m.id === id);
    expect(queued?.content).toBe('helper');
  });
});
