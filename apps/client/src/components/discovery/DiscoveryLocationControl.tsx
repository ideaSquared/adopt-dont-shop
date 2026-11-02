import React from 'react';
import { Button } from '@adopt-dont-shop/lib.components';
import * as styles from './DiscoveryLocationControl.css';

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable' | 'error';

type DiscoveryLocationControlProps = {
  status: LocationStatus;
  hasLocation: boolean;
  onUseLocation: () => void;
  onClear: () => void;
};

const FAILURE_MESSAGES: Partial<Record<LocationStatus, string>> = {
  denied:
    "We couldn't use your location because access was blocked. You can allow it in your browser settings and try again. You can still browse without distances.",
  unavailable:
    "Your browser doesn't support location sharing, so distances aren't available. You can still browse every pet.",
  error: "We couldn't work out your location just now. Please try again.",
};

/**
 * Opt-in "Use my location" control for /discover. The browser permission prompt
 * only ever appears after the adopter presses the button, and a failed attempt
 * is never retried automatically.
 *
 * The single polite live region announces progress, success and failure. The
 * coordinates themselves are never rendered or logged here; they are PII.
 */
export const DiscoveryLocationControl: React.FC<DiscoveryLocationControlProps> = ({
  status,
  hasLocation,
  onUseLocation,
  onClear,
}) => {
  const isLoading = status === 'loading';
  const isSharing = hasLocation && !isLoading;
  const failure = FAILURE_MESSAGES[status];

  const liveMessage = isLoading
    ? 'Finding your location…'
    : isSharing
      ? 'Showing distance from your location'
      : (failure ?? '');

  return (
    <section className={styles.container} aria-label='Distance from your location'>
      <div className={styles.row}>
        {isSharing ? (
          <Button variant='outline' size='sm' onClick={onClear}>
            Stop sharing location
          </Button>
        ) : status === 'unavailable' ? null : (
          <Button variant='outline' size='sm' onClick={onUseLocation} disabled={isLoading}>
            {isLoading
              ? 'Finding your location…'
              : status === 'denied' || status === 'error'
                ? 'Try again'
                : 'Use my location'}
          </Button>
        )}
        {status === 'idle' && !hasLocation && (
          <p className={styles.hint}>
            See how far each pet is from you. We use your location to work out distances and
            don&apos;t store it on our servers.
          </p>
        )}
      </div>
      <div
        className={styles.status({ variant: failure ? 'error' : isSharing ? 'success' : 'info' })}
        role='status'
        aria-live='polite'
        aria-busy={isLoading}
      >
        {liveMessage}
      </div>
    </section>
  );
};
