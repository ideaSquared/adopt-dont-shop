const memoryFallback = new Map<string, string>();

const isBrowser = typeof window !== 'undefined';

function tryLocalStorage(): Storage | null {
  try {
    if (!isBrowser) {
      return null;
    }
    // Test that storage is actually writable (Safari private mode throws on setItem)
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = tryLocalStorage();

export const safeStorage = {
  getItem(key: string): string | null {
    if (storage) {
      try {
        return storage.getItem(key);
      } catch {
        // fall through to memory
      }
    }
    return memoryFallback.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        // fall through to memory
      }
    }
    memoryFallback.set(key, value);
  },

  removeItem(key: string): void {
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // fall through to memory
      }
    }
    memoryFallback.delete(key);
  },
};
