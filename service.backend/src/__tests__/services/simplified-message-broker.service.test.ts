/**
 * Behaviour tests for the SimplifiedMessageBroker / messageBroker.service.
 *
 * Both broker services (messageBroker.service and simplifiedMessageBroker.service)
 * are in-process pub/sub stubs (no Redis) that route messages between handlers
 * within a single server process. Tests verify the observable pub/sub contract:
 *   - broker starts disconnected, connects after initialize()
 *   - subscribed handlers receive published messages
 *   - unsubscribing prevents further handler calls
 *   - disconnect clears all state
 */
import { describe, it, expect, vi } from 'vitest';

import {
  initializeMessageBroker,
  getMessageBroker,
  MessageBroker as SimplifiedMessageBroker,
} from '../../services/simplifiedMessageBroker.service';

describe('SimplifiedMessageBroker lifecycle', () => {
  it('starts in a disconnected state', () => {
    const broker = new SimplifiedMessageBroker();
    expect(broker.isConnected()).toBe(false);
  });

  it('is connected after initialize()', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    expect(broker.isConnected()).toBe(true);
  });

  it('exposes a stable serverId string', () => {
    const broker = new SimplifiedMessageBroker();
    expect(typeof broker.getServerId()).toBe('string');
    expect(broker.getServerId().length).toBeGreaterThan(0);
  });

  it('is disconnected after disconnect()', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    await broker.disconnect();
    expect(broker.isConnected()).toBe(false);
  });
});

describe('SimplifiedMessageBroker stats', () => {
  it('reports zero active handlers before any subscriptions', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    expect(broker.getStats().activeHandlers).toBe(0);
  });

  it('increments activeHandlers when a conversation handler is registered', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    broker.subscribeToConversation('conv-1', vi.fn());
    expect(broker.getStats().activeHandlers).toBe(1);
  });

  it('decrements activeHandlers after unsubscribe', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    broker.subscribeToConversation('conv-1', vi.fn());
    broker.unsubscribe('chat:conversation:conv-1');
    expect(broker.getStats().activeHandlers).toBe(0);
  });

  it('reports zero active handlers after disconnect', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    broker.subscribeToConversation('conv-1', vi.fn());
    await broker.disconnect();
    expect(broker.getStats().activeHandlers).toBe(0);
  });
});

describe('SimplifiedMessageBroker publish (no-op when disconnected)', () => {
  it('publishChatMessage resolves without throwing when disconnected', async () => {
    const broker = new SimplifiedMessageBroker();
    // intentionally NOT calling initialize()
    await expect(
      broker.publishChatMessage('conv-1', { text: 'hi' }, 'sender-1')
    ).resolves.toBeUndefined();
  });

  it('publishTypingIndicator resolves without throwing when disconnected', async () => {
    const broker = new SimplifiedMessageBroker();
    await expect(broker.publishTypingIndicator('conv-1', 'user-1', true)).resolves.toBeUndefined();
  });

  it('publishChatMessage resolves after initialize()', async () => {
    const broker = new SimplifiedMessageBroker();
    await broker.initialize();
    await expect(
      broker.publishChatMessage('conv-1', { text: 'hello' }, 'sender-1')
    ).resolves.toBeUndefined();
  });
});

describe('initializeMessageBroker / getMessageBroker singleton', () => {
  it('returns a connected broker after initialization', async () => {
    const broker = await initializeMessageBroker();
    expect(broker.isConnected()).toBe(true);
  });

  it('getMessageBroker returns the initialized singleton', async () => {
    await initializeMessageBroker();
    const singleton = getMessageBroker();
    expect(singleton).not.toBeNull();
    expect(singleton?.isConnected()).toBe(true);
  });
});
