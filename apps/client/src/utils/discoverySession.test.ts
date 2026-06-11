import { describe, it, expect, beforeEach } from 'vitest';
import { loadDiscoveryState, recordViewedPet, resetDiscoverySession } from './discoverySession';

const STORAGE_KEY = 'discovery.session';

describe('discoverySession', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('loadDiscoveryState', () => {
    it('mints a fresh session when localStorage is empty', () => {
      const state = loadDiscoveryState();
      expect(state.sessionId).toMatch(/^session-/);
      expect(state.viewedPetIds).toEqual([]);
      expect(state.updatedAt).toEqual(expect.any(String));
    });

    it('persists the fresh session so subsequent reads are stable', () => {
      const first = loadDiscoveryState();
      const second = loadDiscoveryState();
      expect(second.sessionId).toBe(first.sessionId);
    });

    it('reads a valid persisted session as-is', () => {
      const persisted = {
        sessionId: 'session-existing',
        viewedPetIds: ['pet-1', 'pet-2'],
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

      const state = loadDiscoveryState();
      expect(state).toEqual(persisted);
    });

    it('mints a new session when the stored payload is malformed JSON', () => {
      window.localStorage.setItem(STORAGE_KEY, 'not json {');
      const state = loadDiscoveryState();
      expect(state.sessionId).toMatch(/^session-/);
      expect(state.viewedPetIds).toEqual([]);
    });

    it('mints a new session when the stored payload has the wrong shape', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: 42 }));
      const state = loadDiscoveryState();
      expect(state.sessionId).toMatch(/^session-/);
      expect(state.viewedPetIds).toEqual([]);
    });
  });

  describe('recordViewedPet', () => {
    it('appends a new pet id to viewedPetIds and persists', () => {
      const state = recordViewedPet('pet-1');
      expect(state.viewedPetIds).toEqual(['pet-1']);

      const reloaded = loadDiscoveryState();
      expect(reloaded.viewedPetIds).toEqual(['pet-1']);
    });

    it('is idempotent — recording the same pet twice keeps a single entry', () => {
      recordViewedPet('pet-1');
      const state = recordViewedPet('pet-1');
      expect(state.viewedPetIds).toEqual(['pet-1']);
    });

    it('bounds viewedPetIds to 500 entries by dropping the oldest', () => {
      const persisted = {
        sessionId: 'session-existing',
        viewedPetIds: Array.from({ length: 500 }, (_, i) => `pet-${i}`),
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

      const state = recordViewedPet('pet-new');
      expect(state.viewedPetIds).toHaveLength(500);
      expect(state.viewedPetIds[0]).toBe('pet-1'); // pet-0 dropped
      expect(state.viewedPetIds[state.viewedPetIds.length - 1]).toBe('pet-new');
    });
  });

  describe('resetDiscoverySession', () => {
    it('replaces the session with a fresh, empty one', () => {
      recordViewedPet('pet-1');
      recordViewedPet('pet-2');

      const fresh = resetDiscoverySession();
      expect(fresh.viewedPetIds).toEqual([]);
      expect(fresh.sessionId).toMatch(/^session-/);

      const reloaded = loadDiscoveryState();
      expect(reloaded.sessionId).toBe(fresh.sessionId);
      expect(reloaded.viewedPetIds).toEqual([]);
    });
  });
});
