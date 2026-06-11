import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdNotificationsActive } from 'react-icons/md';
import notificationService from '@/services/notificationService';
import { useStatsig } from '@/hooks/useStatsig';
import * as styles from './DiscoveryPage.css';

/**
 * ADS-630: shown when `/discover` has exhausted the personalised queue
 * for the current preference set. The CTA opts the user into the
 * existing reminders channel (the no-rate-limit return trigger);
 * push-notification opt-in is a follow-up.
 */
export const EndOfQueueEmptyState: React.FC = () => {
  const { logEvent } = useStatsig();
  const [optedIn, setOptedIn] = useState(false);
  const [optInError, setOptInError] = useState<string | null>(null);

  useEffect(() => {
    logEvent('discover_queue_exhausted_shown', 1);
  }, [logEvent]);

  const handleNotifyOptIn = useCallback(async () => {
    logEvent('discover_queue_exhausted_notify_opt_in_clicked', 1);
    setOptInError(null);
    try {
      await notificationService.updatePreferences({ reminders: true });
      setOptedIn(true);
    } catch (err) {
      setOptInError(err instanceof Error ? err.message : 'Failed to opt in. Please try again.');
    }
  }, [logEvent]);

  const handleBrowseListClicked = useCallback(() => {
    logEvent('discover_queue_exhausted_browse_list_clicked', 1);
  }, [logEvent]);

  return (
    <div className={styles.emptyQueueState} role='status' aria-live='polite'>
      <div className={styles.emptyQueueIcon}>
        <MdNotificationsActive />
      </div>
      <h2 className={styles.emptyQueueTitle}>You&apos;ve seen your top matches</h2>
      <p className={styles.emptyQueueSubtitle}>We&apos;ll have more for you tomorrow.</p>
      <div className={styles.emptyQueueActions}>
        {optedIn ? (
          <span className={styles.emptyQueueOptedIn}>We&apos;ll let you know</span>
        ) : (
          <button
            type='button'
            className={styles.emptyQueueNotifyButton}
            onClick={handleNotifyOptIn}
          >
            Notify me when new matches arrive
          </button>
        )}
        <Link
          className={styles.emptyQueueBrowseLink}
          to='/search'
          onClick={handleBrowseListClicked}
        >
          Browse the full list
        </Link>
      </div>
      {optInError && <p className={styles.emptyQueueError}>{optInError}</p>}
    </div>
  );
};
