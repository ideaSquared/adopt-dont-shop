import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplicationData } from '@/types';

const DRAFT_SCHEMA_VERSION = 1;
const AUTO_SAVE_INTERVAL_MS = 30_000;
const DEBOUNCE_DELAY_MS = 3_000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type ApplicationDraft = {
  petId: string;
  currentStep: number;
  applicationData: Partial<ApplicationData>;
  savedAt: string;
  schemaVersion: number;
};

type UseAutoSaveReturn = {
  lastSaved: Date | null;
  saveStatus: SaveStatus;
  scheduleSave: (data: Partial<ApplicationData>, step: number) => void;
  saveNow: () => void;
  clearDraft: () => void;
  loadedDraft: ApplicationDraft | null;
  hasDraft: boolean;
};

const getDraftKey = (petId: string): string => `application_draft_${petId}`;

const loadDraftFromStorage = (petId: string): ApplicationDraft | null => {
  try {
    const raw = localStorage.getItem(getDraftKey(petId));
    if (!raw) return null;

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

    return parsed as ApplicationDraft;
  } catch {
    localStorage.removeItem(getDraftKey(petId));
    return null;
  }
};

const persistDraft = (petId: string, data: Partial<ApplicationData>, step: number): void => {
  const draft: ApplicationDraft = {
    petId,
    currentStep: step,
    applicationData: data,
    savedAt: new Date().toISOString(),
    schemaVersion: DRAFT_SCHEMA_VERSION,
  };
  localStorage.setItem(getDraftKey(petId), JSON.stringify(draft));
};

export const useAutoSave = (petId: string | undefined): UseAutoSaveReturn => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<ApplicationDraft | null>(null);

  const pendingRef = useRef<{ data: Partial<ApplicationData>; step: number } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!petId) return;
    const draft = loadDraftFromStorage(petId);
    setLoadedDraft(draft);
    setHasDraft(draft !== null);
    if (draft) {
      setLastSaved(new Date(draft.savedAt));
    }
  }, [petId]);

  useEffect(() => {
    if (!petId) return;
    const interval = setInterval(() => {
      if (!pendingRef.current) return;
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
    (data: Partial<ApplicationData>, step: number) => {
      if (!petId) return;
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
    if (!petId || !pendingRef.current) return;
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
    if (!petId) return;
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
