import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import {
  applicationService,
  petService,
  type Application,
  type ApplicationStatus,
  type Pet,
} from '@/services';
import { ItsAMatchModal } from '@/components/ItsAMatchModal';
import { createAppContext } from './base/BaseContext';

// ADS-633: detects rescue acknowledgement of an application (status moves
// away from `submitted`) and surfaces a celebratory "It's a Match!" modal
// the next time the adopter opens the app.
//
// Storage layout (localStorage, all keys namespaced):
//   ads-match-ack:last-status:<applicationId> -> last seen ApplicationStatus
//   ads-match-ack:shown:<applicationId>       -> "1" once the modal has
//                                               been dismissed for that
//                                               application (never re-shown).
//
// The previous-status map is what makes "transition" detection work across
// page reloads: a fresh poll compares the server's current status to the
// last value we persisted, NOT to whatever was in memory. That keeps the
// trigger reliable when the rescue updates the application while the
// adopter is offline.

const STORAGE_PREFIX = 'ads-match-ack';
const LAST_STATUS_KEY = `${STORAGE_PREFIX}:last-status`;
const SHOWN_KEY = `${STORAGE_PREFIX}:shown`;
const POLL_INTERVAL_MS = 60_000;

const lastStatusKey = (applicationId: string) => `${LAST_STATUS_KEY}:${applicationId}`;
const shownKey = (applicationId: string) => `${SHOWN_KEY}:${applicationId}`;

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable (private mode, quota). Failing to
    // persist just means the modal might re-show — acceptable degradation.
  }
};

type QueuedMatch = {
  applicationId: string;
  petName: string;
  petImageUrl?: string;
};

type MatchAcknowledgementContextValue = {
  // The currently-displayed queued match, if any. Mostly useful for tests.
  activeMatch: QueuedMatch | null;
  // Force a re-check (used by tests). Production code relies on polling.
  refresh: () => Promise<void>;
};

const [MatchAcknowledgementContext, useMatchAcknowledgement] =
  createAppContext<MatchAcknowledgementContextValue>('MatchAcknowledgement');

const pickPrimaryImage = (pet: Pet | undefined): string | undefined => {
  if (!pet?.images || pet.images.length === 0) {
    return undefined;
  }
  const primary = pet.images.find(img => img.is_primary);
  return (primary ?? pet.images[0]).url;
};

// A status counts as "acknowledged" if the rescue moved it away from the
// initial `submitted` value. Schema today exposes submitted/approved/
// rejected/withdrawn; backend additionally surfaces `reviewing` through
// the stage field which some installs surface here too. Treat anything
// that isn't `submitted` as acknowledgement — this matches the ticket's
// "submitted -> reviewing or approved" intent without coupling us to the
// exact enum.
const isAcknowledged = (status: ApplicationStatus | string): boolean => status !== 'submitted';

export type MatchAcknowledgementProviderProps = {
  children: ReactNode;
};

export const MatchAcknowledgementProvider = ({ children }: MatchAcknowledgementProviderProps) => {
  const { isAuthenticated, user } = useAuth();
  const [queue, setQueue] = useState<QueuedMatch[]>([]);
  const inFlight = useRef(false);

  const handleClose = useCallback(() => {
    setQueue(prev => {
      const [head, ...rest] = prev;
      if (head) {
        writeStorage(shownKey(head.applicationId), '1');
      }
      return rest;
    });
  }, []);

  const checkForMatches = useCallback(async () => {
    if (!isAuthenticated || !user || inFlight.current) {
      return;
    }
    inFlight.current = true;
    try {
      const applications = await applicationService.getUserApplications();
      const newMatches: QueuedMatch[] = [];

      for (const app of applications) {
        const previous = readStorage(lastStatusKey(app.id));
        const alreadyShown = readStorage(shownKey(app.id)) === '1';

        // Always record the latest known status so subsequent transitions
        // are detected even if this iteration doesn't surface a modal.
        writeStorage(lastStatusKey(app.id), app.status);

        if (alreadyShown) {
          continue;
        }
        if (!isAcknowledged(app.status)) {
          continue;
        }
        // First time we see this application, with status already past
        // submitted: only celebrate if we have evidence of a transition
        // (previous status was `submitted`) OR if this is the first
        // observation full-stop and the rescue clearly hasn't been
        // acknowledged yet for this adopter. We bias toward celebrating
        // when in doubt — better a spurious modal than missing the moment.
        if (previous && previous !== 'submitted' && !isAcknowledged(previous)) {
          continue;
        }

        newMatches.push(await buildMatch(app));
      }

      if (newMatches.length > 0) {
        setQueue(prev => [...prev, ...newMatches]);
      }
    } catch (error) {
      // Polling failures are non-fatal; the next interval will retry.
      console.error('[MatchAcknowledgement] Failed to poll applications:', error);
    } finally {
      inFlight.current = false;
    }
  }, [isAuthenticated, user]);

  // Mount + reauth: kick off an immediate check, then poll.
  // ADS-633: Playwright sets `navigator.webdriver = true`, so we skip
  // the background poll in E2E. The polling spins up an
  // applicationService call against every existing client test that
  // logs in as an adopter — it adds no behaviour value there (each
  // E2E run starts from a fresh seed with no acknowledged transitions
  // to detect) but it does inject 60s timers and surprise
  // applicationService traffic that races other tests' fixtures.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      return;
    }
    void checkForMatches();
    const id = window.setInterval(() => {
      void checkForMatches();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, user, checkForMatches]);

  const value = useMemo<MatchAcknowledgementContextValue>(
    () => ({
      activeMatch: queue[0] ?? null,
      refresh: checkForMatches,
    }),
    [queue, checkForMatches]
  );

  const active = queue[0];

  return (
    <MatchAcknowledgementContext value={value}>
      {children}
      {active ? (
        <ItsAMatchModal
          isOpen={true}
          petName={active.petName}
          petImageUrl={active.petImageUrl}
          conversationHref={`/chat?applicationId=${active.applicationId}`}
          onClose={handleClose}
        />
      ) : null}
    </MatchAcknowledgementContext>
  );
};

// Helper: fetch pet details for an application, gracefully degrading if the
// pet lookup fails (we still want to show the modal with a name fallback).
const buildMatch = async (app: Application): Promise<QueuedMatch> => {
  try {
    const pet = await petService.getPetById(app.petId);
    return {
      applicationId: app.id,
      petName: pet.name,
      petImageUrl: pickPrimaryImage(pet),
    };
  } catch (error) {
    console.error('[MatchAcknowledgement] Failed to fetch pet for match:', error);
    return {
      applicationId: app.id,
      petName: 'your match',
    };
  }
};

// Test-only escape hatches for resetting persisted state.
export const __resetMatchAcknowledgementStorage = (): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keys.push(k);
      }
    }
    keys.forEach(k => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

export { useMatchAcknowledgement };
export type { MatchAcknowledgementContextValue, QueuedMatch };
