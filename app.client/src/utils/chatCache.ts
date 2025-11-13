/**
 * Chat caching utility for improving performance
 * Implements in-memory caching with TTL and LRU eviction
 */

// Temporary local types until chat library types are fully defined
interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export class ChatCache<T = unknown> {
  private cache = new Map<string, CacheItem<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100; // 100 items default

    // Set up automatic cleanup
    const cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    const now = Date.now();

    // Check if item has expired
    if (now - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access tracking for LRU
    item.accessCount++;
    item.lastAccessed = now;

    return item.data;
  }

  set(key: string, data: T): void {
    const now = Date.now();

    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    });
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    items: Array<{ key: string; age: number; accessCount: number }>;
  } {
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      age: now - item.timestamp,
      accessCount: item.accessCount,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      items,
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  private calculateHitRate(): number {
    // This is a simple implementation - in production you'd want more sophisticated tracking
    const totalAccesses = Array.from(this.cache.values()).reduce(
      (sum, item) => sum + item.accessCount,
      0
    );
    return this.cache.size > 0 ? totalAccesses / this.cache.size : 0;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Specialized caches for different data types
export class MessageCache extends ChatCache<Message[]> {
  constructor() {
    super({
      ttl: 10 * 60 * 1000, // 10 minutes for messages
      maxSize: 500, // More messages can be cached
      cleanupInterval: 2 * 60 * 1000, // Cleanup every 2 minutes
    });
  }

  getMessages(conversationId: string, page: number): Message[] | null {
    return this.get(`messages:${conversationId}:${page}`);
  }

  setMessages(conversationId: string, page: number, messages: Message[]): void {
    this.set(`messages:${conversationId}:${page}`, messages);
  }

  invalidateConversation(conversationId: string): void {
    this.invalidatePattern(`messages:${conversationId}:`);
  }
}

export class ConversationCache extends ChatCache<Conversation[] | Conversation> {
  constructor() {
    super({
      ttl: 5 * 60 * 1000, // 5 minutes for conversations
      maxSize: 100,
      cleanupInterval: 60 * 1000,
    });
  }

  getConversations(userId: string): Conversation[] | null {
    const result = this.get(`conversations:${userId}`);
    return Array.isArray(result) ? result : null;
  }

  setConversations(userId: string, conversations: Conversation[]): void {
    this.set(`conversations:${userId}`, conversations);
  }

  getConversation(conversationId: string): Conversation | null {
    const result = this.get(`conversation:${conversationId}`);
    return Array.isArray(result) ? null : result;
  }

  setConversation(conversationId: string, conversation: Conversation): void {
    this.set(`conversation:${conversationId}`, conversation);
  }

  invalidateUser(userId: string): void {
    this.invalidatePattern(`conversations:${userId}`);
  }
}

// Create singleton instances
export const messageCache = new MessageCache();
export const conversationCache = new ConversationCache();

// Export cache manager for coordinated operations
export class ChatCacheManager {
  static invalidateConversation(conversationId: string): void {
    messageCache.invalidateConversation(conversationId);
    conversationCache.delete(`conversation:${conversationId}`);
  }

  static invalidateUser(userId: string): void {
    conversationCache.invalidateUser(userId);
  }

  static clearAll(): void {
    messageCache.clear();
    conversationCache.clear();
  }

  static getStats(): {
    messages: ReturnType<MessageCache['getStats']>;
    conversations: ReturnType<ConversationCache['getStats']>;
  } {
    return {
      messages: messageCache.getStats(),
      conversations: conversationCache.getStats(),
    };
  }

  static destroy(): void {
    messageCache.destroy();
    conversationCache.destroy();
  }
}
