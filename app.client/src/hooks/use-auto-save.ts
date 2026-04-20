import { useCallback, useEffect, useRef, useState } from 'react';

const DRAFT_SCHEMA_VERSION = 1;
const AUTO_SAVE_INTERVAL_MS = 30_000;
const DEBOUNCE_DELAY_MS = 3_000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type ApplicationDraft<TData = Record<string, unknown>> = {
  petId: string;
  currentStep: number;
  applicationData: TData;
  savedAt: string;
  schemaVersion: number;
};

type UseAutoSaveReturn<TData> = {
  lastSaved: Date | null;
  saveStatus: SaveStatus;
  scheduleSave: (data: TData, step: number) => void;
  saveNow: () => void;
  clearDraft: () => void;
  loadedDraft: ApplicationDraft<TData> | null;
  hasDraft: boolean;
};

const getDraftKey = (petId: string): string => `application_draft_${petId}`;

const loadDraftFromStorage = <TData>(petId: string): ApplicationDraft<TData> | null => {
  try {
    const raw = localStorage.getItem(getDraftKey(petId));
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('schemaVersion' in parsed) ||
      (parsed as { schemaVersion: unknown }).schemaVersion !== DRAFT_SCHEMA_VERSION
    ) {
      localStorage.removeItem(getDraftKey(petId));
      return null;
    }

    return parsed as ApplicationDraft<TData>;
  } catch {
    localStorage.removeItem(getDraftKey(petId));
    return null;
  }
};

const persistDraft = <TData>(petId: string, data: TData, step: number): void => {
  const draft: ApplicationDraft<TData> = {
    petId,
    currentStep: step,
    applicationData: data,
    savedAt: new Date().toISOString(),
    schemaVersion: DRAFT_SCHEMA_VERSION,
  };
  localStorage.setItem(getDraftKey(petId), JSON.stringify(draft));
};

export const useAutoSave = <TData = Record<string, unknown>>(
  petId: string | undefined
): UseAutoSaveReturn<TData> => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<ApplicationDraft<TData> | null>(null);

  const pendingRef = useRef<{ data: TData; step: number } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!petId) {
      return;
    }
    const draft = loadDraftFromStorage<TData>(petId);
    setLoadedDraft(draft);
    setHasDraft(draft !== null);
    if (draft) {
      setLastSaved(new Date(draft.savedAt));
    }
  }, [petId]);

  useEffect(() => {
    if (!petId) {
      return;
    }
    const interval = setInterval(() => {
      if (!pendingRef.current) {
        return;
      }
      const { data, step } = pendingRef.current;
      try {
        setSaveStatus('saving');
        persistDraft(petId, data, step);
        setLastSaved(new Date());
        setHasDraft(true);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [petId]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const scheduleSave = useCallback(
    (data: TData, step: number) => {
      if (!petId) {
        return;
      }
      pendingRef.current = { data, step };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        try {
          setSaveStatus('saving');
          persistDraft(petId, data, step);
          setLastSaved(new Date());
          setHasDraft(true);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      }, DEBOUNCE_DELAY_MS);
    },
    [petId]
  );

  const saveNow = useCallback(() => {
    if (!petId || !pendingRef.current) {
      return;
    }
    const { data, step } = pendingRef.current;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    try {
      setSaveStatus('saving');
      persistDraft(petId, data, step);
      setLastSaved(new Date());
      setHasDraft(true);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [petId]);

  const clearDraft = useCallback(() => {
    if (!petId) {
      return;
    }
    localStorage.removeItem(getDraftKey(petId));
    pendingRef.current = null;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setHasDraft(false);
    setLastSaved(null);
    setLoadedDraft(null);
    setSaveStatus('idle');
  }, [petId]);

  return { saveStatus, lastSaved, scheduleSave, saveNow, clearDraft, loadedDraft, hasDraft };
};
