import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '@/services';

export type DraftSaveStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';
/**
 * Backwards-compatible alias kept after the use-auto-save → useApplicationDraft
 * migration so ApplicationForm / QuickApplyView don't need to re-type their
 * `saveStatus` prop. New code should prefer `DraftSaveStatus`.
 */
export type SaveStatus = DraftSaveStatus;

export type ApplicationDraftPayload = {
  petId: string;
  answers: Record<string, unknown>;
  updatedAt: string;
  expiresAt: string | null;
};

type ApiResponse<T> = { data: T };

type UseApplicationDraftReturn = {
  /** Draft hydrated from the server on mount, or null when the user has none. */
  loadedDraft: ApplicationDraftPayload | null;
  /** Whether the initial GET is still in flight. */
  isLoading: boolean;
  /** Last save lifecycle state — drives the "Saving…" / "Saved" / "Couldn't save" hint. */
  saveStatus: DraftSaveStatus;
  /** Most recent successful save time, or the loaded draft's updatedAt. */
  lastSaved: Date | null;
  /** Debounced PUT — call on every form change. */
  scheduleSave: (answers: Record<string, unknown>) => void;
  /** Force-flush the pending debounced save. */
  saveNow: () => void;
  /** DELETE the draft (called on successful submit / withdraw). */
  clearDraft: () => Promise<void>;
};

const DRAFT_DEBOUNCE_MS = 1_500;

const draftUrl = (petId: string): string =>
  `/api/v1/applications/drafts/${encodeURIComponent(petId)}`;

/**
 * Backend-synced draft hook (replaces the localStorage-based useAutoSave).
 *
 * Server is canonical: on mount we GET the draft (404 = start fresh, 200 =
 * hydrate). On every change the caller passes the latest answers; we
 * debounce ~1.5s and PUT the whole payload (last-write-wins). On submit
 * the caller invokes clearDraft to DELETE the row.
 */
export const useApplicationDraft = (petId: string | undefined): UseApplicationDraftReturn => {
  const [loadedDraft, setLoadedDraft] = useState<ApplicationDraftPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(petId));
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing draft on mount / when petId changes.
  useEffect(() => {
    if (!petId) {
      setLoadedDraft(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    apiService
      .get<ApiResponse<ApplicationDraftPayload>>(draftUrl(petId))
      .then(response => {
        if (cancelled) {
          return;
        }
        setLoadedDraft(response.data);
        setLastSaved(new Date(response.data.updatedAt));
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        // 404 is the "no draft yet" case — silent, not an error.
        const status =
          err && typeof err === 'object' && 'status' in err
            ? (err as { status: unknown }).status
            : undefined;
        if (status !== 404) {
          // Surface non-404 failures so the UI can render a hint; we don't
          // re-throw because losing the GET shouldn't block the form.
          setSaveStatus('error');
        }
        setLoadedDraft(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [petId]);

  // Flush pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSave = useCallback(
    async (answers: Record<string, unknown>) => {
      if (!petId) {
        return;
      }
      try {
        setSaveStatus('saving');
        const response = await apiService.put<ApiResponse<ApplicationDraftPayload>>(
          draftUrl(petId),
          { answers }
        );
        setLastSaved(new Date(response.data.updatedAt));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    },
    [petId]
  );

  const scheduleSave = useCallback(
    (answers: Record<string, unknown>) => {
      if (!petId) {
        return;
      }
      pendingRef.current = answers;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        const payload = pendingRef.current;
        pendingRef.current = null;
        debounceTimerRef.current = null;
        if (payload) {
          void performSave(payload);
        }
      }, DRAFT_DEBOUNCE_MS);
    },
    [petId, performSave]
  );

  const saveNow = useCallback(() => {
    if (!petId || !pendingRef.current) {
      return;
    }
    const payload = pendingRef.current;
    pendingRef.current = null;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void performSave(payload);
  }, [petId, performSave]);

  const clearDraft = useCallback(async () => {
    if (!petId) {
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingRef.current = null;
    try {
      await apiService.delete(draftUrl(petId));
    } catch {
      // Non-fatal: deleting the draft on submit is best-effort. The TTL
      // will reap it later.
    }
    setLoadedDraft(null);
    setLastSaved(null);
    setSaveStatus('idle');
  }, [petId]);

  return {
    loadedDraft,
    isLoading,
    saveStatus,
    lastSaved,
    scheduleSave,
    saveNow,
    clearDraft,
  };
};
