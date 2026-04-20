/**
 * Behavioral tests for auto-save functionality
 *
 * Covers the expected business behaviors:
 * - Draft is restored when user returns to an in-progress form
 * - Form data is saved automatically after the user pauses typing
 * - Periodic saves run every 30 seconds regardless of user activity
 * - User can manually trigger an immediate save
 * - Draft is cleared after successful application submission
 * - Independent drafts are maintained per pet
 * - Outdated or corrupted drafts are discarded safely
 * - Save status is accurately reflected throughout the lifecycle
 */

import { renderHook, act } from '@testing-library/react';
import { useAutoSave, ApplicationDraft } from '../hooks/use-auto-save';
import type { ApplicationData } from '@/types';

const DRAFT_KEY_PREFIX = 'application_draft_';
const AUTO_SAVE_INTERVAL_MS = 30_000;
const DEBOUNCE_DELAY_MS = 3_000;
const CURRENT_SCHEMA_VERSION = 1;

const mockApplicationData: Partial<ApplicationData> = {
  personalInfo: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '07700900000',
    address: '1 High Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  },
};

const buildStoredDraft = (overrides: Partial<ApplicationDraft> = {}): ApplicationDraft => ({
  petId: 'pet-abc',
  currentStep: 2,
  applicationData: mockApplicationData,
  savedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  ...overrides,
});

describe('Auto-save behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('Draft restoration on return', () => {
    it('provides no draft when user visits form for the first time', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      expect(result.current.loadedDraft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSaved).toBeNull();
    });

    it('restores a previously saved draft when user returns to the form', () => {
      const stored = buildStoredDraft({ currentStep: 3 });
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-abc`, JSON.stringify(stored));

      const { result } = renderHook(() => useAutoSave('pet-abc'));

      expect(result.current.loadedDraft).not.toBeNull();
      expect(result.current.loadedDraft?.currentStep).toBe(3);
      expect(result.current.loadedDraft?.applicationData.personalInfo?.firstName).toBe('Jane');
      expect(result.current.hasDraft).toBe(true);
    });

    it('surfaces the timestamp of when the draft was last saved', () => {
      const stored = buildStoredDraft({ savedAt: '2024-01-15T10:00:00Z' });
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-abc`, JSON.stringify(stored));

      const { result } = renderHook(() => useAutoSave('pet-abc'));

      expect(result.current.lastSaved).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('loads drafts per pet so different applications do not interfere', () => {
      const draftA = buildStoredDraft({ petId: 'pet-aaa', currentStep: 1 });
      const draftB = buildStoredDraft({ petId: 'pet-bbb', currentStep: 4 });
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-aaa`, JSON.stringify(draftA));
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-bbb`, JSON.stringify(draftB));

      const { result: resultA } = renderHook(() => useAutoSave('pet-aaa'));
      const { result: resultB } = renderHook(() => useAutoSave('pet-bbb'));

      expect(resultA.current.loadedDraft?.currentStep).toBe(1);
      expect(resultB.current.loadedDraft?.currentStep).toBe(4);
    });

    it('discards drafts created by an older incompatible schema version', () => {
      const outdatedDraft = buildStoredDraft({ schemaVersion: 0 });
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-abc`, JSON.stringify(outdatedDraft));

      const { result } = renderHook(() => useAutoSave('pet-abc'));

      expect(result.current.loadedDraft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
    });

    it('discards corrupted draft data without crashing', () => {
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-abc`, 'this is not valid json{{');

      const { result } = renderHook(() => useAutoSave('pet-abc'));

      expect(result.current.loadedDraft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
    });

    it('handles missing petId gracefully', () => {
      const { result } = renderHook(() => useAutoSave(undefined));

      expect(result.current.loadedDraft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
    });
  });

  describe('Debounced auto-save on data change', () => {
    it('saves draft to localStorage after the debounce delay', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 2);
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();

      act(() => {
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`);
      expect(stored).not.toBeNull();
      const parsed: ApplicationDraft = JSON.parse(stored!);
      expect(parsed.currentStep).toBe(2);
      expect(parsed.applicationData.personalInfo?.firstName).toBe('Jane');
    });

    it('debounces rapid successive changes into a single save', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave({ personalInfo: { ...mockApplicationData.personalInfo!, firstName: 'A' } }, 1);
        vi.advanceTimersByTime(1000);
        result.current.scheduleSave({ personalInfo: { ...mockApplicationData.personalInfo!, firstName: 'AB' } }, 1);
        vi.advanceTimersByTime(1000);
        result.current.scheduleSave({ personalInfo: { ...mockApplicationData.personalInfo!, firstName: 'ABC' } }, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`);
      const parsed: ApplicationDraft = JSON.parse(stored!);
      expect(parsed.applicationData.personalInfo?.firstName).toBe('ABC');
    });

    it('does not save before the debounce delay has elapsed', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS - 1);
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
    });

    it('does not save when petId is undefined', () => {
      const { result } = renderHook(() => useAutoSave(undefined));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
    });

    it('updates hasDraft to true and lastSaved after the first save', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.lastSaved).not.toBeNull();
    });
  });

  describe('Periodic auto-save every 30 seconds', () => {
    it('saves pending data at each 30-second interval', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 2);
      });

      // Before debounce fires, advance to first interval
      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS);
      });

      const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`);
      expect(stored).not.toBeNull();
      const parsed: ApplicationDraft = JSON.parse(stored!);
      expect(parsed.currentStep).toBe(2);
    });

    it('does not write to storage during interval when there is no pending data', () => {
      renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS);
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
    });

    it('saves the most recent data at the interval, not stale earlier data', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(
          { personalInfo: { ...mockApplicationData.personalInfo!, firstName: 'First' } },
          1
        );
        vi.advanceTimersByTime(1000);
        result.current.scheduleSave(
          { personalInfo: { ...mockApplicationData.personalInfo!, firstName: 'Latest' } },
          3
        );
      });

      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS);
      });

      const parsed: ApplicationDraft = JSON.parse(
        localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)!
      );
      expect(parsed.applicationData.personalInfo?.firstName).toBe('Latest');
      expect(parsed.currentStep).toBe(3);
    });
  });

  describe('Manual save', () => {
    it('saves the draft immediately without waiting for the debounce', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 2);
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();

      act(() => {
        result.current.saveNow();
      });

      const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`);
      expect(stored).not.toBeNull();
    });

    it('does nothing when saveNow is called before any data has been scheduled', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.saveNow();
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
    });

    it('cancels the pending debounce when saveNow is called', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        result.current.saveNow();
      });

      const savedAt = JSON.parse(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)!).savedAt;

      // Advance past debounce - no second write should occur
      act(() => {
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      const savedAtAfter = JSON.parse(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)!).savedAt;
      expect(savedAtAfter).toBe(savedAt);
    });
  });

  describe('Draft cleared on successful submission', () => {
    it('removes the draft from localStorage when the application is submitted', () => {
      const stored = buildStoredDraft();
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-abc`, JSON.stringify(stored));

      const { result } = renderHook(() => useAutoSave('pet-abc'));
      expect(result.current.hasDraft).toBe(true);

      act(() => {
        result.current.clearDraft();
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.loadedDraft).toBeNull();
    });

    it('cancels any pending auto-save after the draft is cleared', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        result.current.clearDraft();
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)).toBeNull();
    });

    it('only clears the draft for the current pet, leaving others intact', () => {
      const draftA = buildStoredDraft({ petId: 'pet-aaa' });
      const draftB = buildStoredDraft({ petId: 'pet-bbb' });
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-aaa`, JSON.stringify(draftA));
      localStorage.setItem(`${DRAFT_KEY_PREFIX}pet-bbb`, JSON.stringify(draftB));

      const { result } = renderHook(() => useAutoSave('pet-aaa'));

      act(() => {
        result.current.clearDraft();
      });

      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-aaa`)).toBeNull();
      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-bbb`)).not.toBeNull();
    });
  });

  describe('Save status indicator', () => {
    it('starts in idle status', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      expect(result.current.saveStatus).toBe('idle');
    });

    it('transitions to saved status after a successful debounced save', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      expect(result.current.saveStatus).toBe('saved');
    });

    it('transitions to saved status after a successful manual save', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        result.current.saveNow();
      });

      expect(result.current.saveStatus).toBe('saved');
    });

    it('returns to idle status after the draft is cleared', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      expect(result.current.saveStatus).toBe('saved');

      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.saveStatus).toBe('idle');
    });
  });

  describe('Schema version and stored draft structure', () => {
    it('stores the schema version in every saved draft', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      const parsed: ApplicationDraft = JSON.parse(
        localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)!
      );
      expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('stores the petId in every saved draft', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      const parsed: ApplicationDraft = JSON.parse(
        localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)!
      );
      expect(parsed.petId).toBe('pet-abc');
    });

    it('stores a valid ISO timestamp in every saved draft', () => {
      const { result } = renderHook(() => useAutoSave('pet-abc'));

      act(() => {
        result.current.scheduleSave(mockApplicationData, 1);
        vi.advanceTimersByTime(DEBOUNCE_DELAY_MS);
      });

      const parsed: ApplicationDraft = JSON.parse(
        localStorage.getItem(`${DRAFT_KEY_PREFIX}pet-abc`)!
      );
      expect(new Date(parsed.savedAt).toString()).not.toBe('Invalid Date');
    });
  });
});
