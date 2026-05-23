import React, { useCallback, useEffect, useState } from 'react';

import * as styles from './SanctionBanner.css';

/**
 * Shape of one active sanction returned by
 * GET /api/v1/auth/sanctions/active.
 */
export type ActiveSanction = {
  id: string;
  type: string;
  reason: string;
  severity: string;
  expiresAt: string | null;
  acknowledgedAt: string | null;
};

export type SanctionBannerProps = {
  /**
   * Fetch the caller's active unacknowledged sanctions. Each app wires
   * this to its configured api client.
   */
  fetchSanctions: () => Promise<ActiveSanction[]>;
  /**
   * Mark a single sanction as acknowledged. Resolves on 204.
   */
  acknowledgeSanction: (id: string) => Promise<void>;
  /**
   * External refresh trigger — when this value changes, the banner
   * re-queries fetchSanctions. Apps pass a value derived from the
   * notifications stream (e.g. the latest sanction notification id) so
   * a freshly-issued sanction appears without a page reload.
   */
  refreshKey?: string | number;
  'data-testid'?: string;
};

const TITLES: Record<string, string> = {
  warning_issued: 'A moderator issued you a warning',
  user_suspended: 'Your account has been suspended',
  user_banned: 'Your account has been banned',
  account_restricted: 'Your account has been restricted',
};

const titleFor = (type: string): string =>
  TITLES[type] ?? 'A moderation action was taken on your account';

const variantFor = (type: string): keyof typeof styles.banner =>
  type === 'warning_issued' ? 'warning' : 'danger';

const formatExpiry = (expiresAt: string | null): string | null => {
  if (!expiresAt) {
    return null;
  }
  try {
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return `Expires ${date.toLocaleString()}`;
  } catch {
    return null;
  }
};

export const SanctionBanner: React.FC<SanctionBannerProps> = ({
  fetchSanctions,
  acknowledgeSanction,
  refreshKey,
  'data-testid': testId = 'sanction-banner',
}) => {
  const [sanctions, setSanctions] = useState<ActiveSanction[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchSanctions();
      setSanctions(next);
    } catch {
      // Best-effort — a failed fetch shouldn't break the rest of the
      // app. Leave the current list in place.
    }
  }, [fetchSanctions]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const handler = () => {
      void load();
    };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [load]);

  const handleDismiss = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await acknowledgeSanction(id);
        setSanctions(prev => prev.filter(s => s.id !== id));
      } catch {
        // Leave the banner up if acknowledge fails — the user can retry.
      } finally {
        setBusyId(null);
      }
    },
    [acknowledgeSanction]
  );

  if (sanctions.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.region}
      role='region'
      aria-label='Active account sanctions'
      data-testid={testId}
    >
      {sanctions.map(sanction => {
        const variant = variantFor(sanction.type);
        const titleId = `${testId}-${sanction.id}-title`;
        const expiry = formatExpiry(sanction.expiresAt);
        return (
          <div
            key={sanction.id}
            className={styles.banner[variant]}
            role='alert'
            aria-labelledby={titleId}
            data-testid={`${testId}-item`}
            data-sanction-id={sanction.id}
            data-severity={sanction.severity}
          >
            <div className={styles.content}>
              <h2 id={titleId} className={styles.title}>
                {titleFor(sanction.type)}
              </h2>
              <p className={styles.description}>{sanction.reason}</p>
              {expiry ? <p className={styles.expiry}>{expiry}</p> : null}
            </div>
            <button
              type='button'
              className={styles.dismissButton}
              onClick={() => {
                void handleDismiss(sanction.id);
              }}
              disabled={busyId === sanction.id}
              data-testid={`${testId}-dismiss-${sanction.id}`}
            >
              Acknowledge
            </button>
          </div>
        );
      })}
    </div>
  );
};
