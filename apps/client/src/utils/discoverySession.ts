const STORAGE_KEY = 'discovery.session';
const MAX_VIEWED = 500; // bound localStorage growth

export type DiscoveryState = {
  sessionId: string;
  viewedPetIds: string[];
  updatedAt: string;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const generateSessionId = (): string => {
  if (isBrowser && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `session-${crypto.randomUUID()}`;
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export const loadDiscoveryState = (): DiscoveryState => {
  if (!isBrowser) {
    return {
      sessionId: generateSessionId(),
      viewedPetIds: [],
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh: DiscoveryState = {
        sessionId: generateSessionId(),
        viewedPetIds: [],
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<DiscoveryState>;
    if (
      typeof parsed.sessionId === 'string' &&
      Array.isArray(parsed.viewedPetIds) &&
      parsed.viewedPetIds.every(v => typeof v === 'string')
    ) {
      return {
        sessionId: parsed.sessionId,
        viewedPetIds: parsed.viewedPetIds,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }
  } catch {
    // fall through
  }
  const fresh: DiscoveryState = {
    sessionId: generateSessionId(),
    viewedPetIds: [],
    updatedAt: new Date().toISOString(),
  };
  if (isBrowser) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }
  return fresh;
};

export const recordViewedPet = (petId: string): DiscoveryState => {
  const state = loadDiscoveryState();
  if (state.viewedPetIds.includes(petId)) {
    return state;
  }
  const next: DiscoveryState = {
    ...state,
    viewedPetIds: [...state.viewedPetIds, petId].slice(-MAX_VIEWED),
    updatedAt: new Date().toISOString(),
  };
  if (isBrowser) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
};

export const resetDiscoverySession = (): DiscoveryState => {
  const fresh: DiscoveryState = {
    sessionId: generateSessionId(),
    viewedPetIds: [],
    updatedAt: new Date().toISOString(),
  };
  if (isBrowser) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }
  return fresh;
};
