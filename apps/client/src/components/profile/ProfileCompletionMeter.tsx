import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useStatsig } from '@/hooks/useStatsig';
import {
  PROFILE_COMPLETION_SECTIONS,
  PROFILE_METER_CELEBRATED_STORAGE_KEY,
  PROFILE_METER_DISMISSED_STORAGE_KEY,
  calculateProfileCompletion,
  type ProfileCompletionSection,
} from '@/utils/profileCompletion';
import * as styles from './ProfileCompletionMeter.css';

/**
 * ADS-629: persistent profile-completion meter shown at the top of
 * /discover and /profile. Dismissible per session via the local
 * storage key in `profileCompletion.ts`; reappears on the next page
 * load when completion is still below 100%. At 100% the meter renders
 * a one-time celebration (driven by a second storage key) and then
 * disappears for good.
 */
export const ProfileCompletionMeter: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { logEvent } = useStatsig();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.sessionStorage.getItem(PROFILE_METER_DISMISSED_STORAGE_KEY) === 'true';
  });
  const [celebrationDismissed, setCelebrationDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(PROFILE_METER_CELEBRATED_STORAGE_KEY) === 'true';
  });

  const completion = useMemo(() => calculateProfileCompletion(user), [user]);
  const isComplete = completion.percent >= 100;

  const handleCelebrationDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROFILE_METER_CELEBRATED_STORAGE_KEY, 'true');
    }
    setCelebrationDismissed(true);
  }, []);

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PROFILE_METER_DISMISSED_STORAGE_KEY, 'true');
    }
    setDismissed(true);
  }, []);

  const handleSegmentClick = useCallback(
    (section: ProfileCompletionSection) => {
      logEvent('profile_meter_clicked', 1, { target: section.key });
    },
    [logEvent]
  );

  useEffect(() => {
    if (isComplete && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PROFILE_METER_DISMISSED_STORAGE_KEY);
    }
  }, [isComplete]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (isComplete) {
    if (celebrationDismissed) {
      return null;
    }
    return (
      <div className={styles.celebration} role='status' aria-live='polite'>
        <span className={styles.celebrationIcon} aria-hidden='true'>
          🎉
        </span>
        <div className={styles.celebrationBody}>
          <h3 className={styles.celebrationTitle}>Profile complete!</h3>
          <p className={styles.celebrationSubtitle}>
            You&apos;ll see our highest-confidence Pawfect Match badges from now on.
          </p>
        </div>
        <button
          type='button'
          className={styles.celebrationClose}
          aria-label='Dismiss'
          onClick={handleCelebrationDismiss}
        >
          ×
        </button>
      </div>
    );
  }

  if (dismissed) {
    return null;
  }

  return (
    <div className={styles.meter} role='region' aria-label='Profile completion'>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Profile {completion.percent}% complete</span>
        <button
          type='button'
          className={styles.dismissButton}
          aria-label='Dismiss meter until next session'
          onClick={handleDismiss}
        >
          ×
        </button>
      </div>
      <div className={styles.segments} role='list'>
        {PROFILE_COMPLETION_SECTIONS.map(section => {
          const done = completion.completedSections.includes(section.key);
          return (
            <Link
              key={section.key}
              role='listitem'
              to={section.deepLink}
              className={done ? styles.segmentDone : styles.segmentTodo}
              onClick={() => handleSegmentClick(section)}
            >
              <span className={styles.segmentLabel}>{section.label}</span>
              <span className={styles.segmentStatus}>{done ? 'Done' : 'Add'}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
