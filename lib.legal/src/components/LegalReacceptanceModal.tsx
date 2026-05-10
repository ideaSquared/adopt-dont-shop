import { Alert, Button, Modal, Spinner } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useEffect, useState } from 'react';
import {
  fetchPendingReacceptance,
  recordReacceptance,
  type PendingReacceptanceItem,
} from '../services/legal-service';
import * as styles from './LegalReacceptanceModal.css';

/**
 * ADS-497 (slice 2): user-facing legal re-acceptance modal.
 *
 * After login, hits GET /api/v1/legal/pending-reacceptance once. If the
 * authenticated user has any documents whose published version is newer
 * than what they last accepted, the modal renders a hard block — they
 * must tick each document and submit before continuing to use the app.
 *
 * The modal is intentionally non-dismissable for terms/privacy. There is
 * no logout/decline path here: that's an explicit out-of-scope decision
 * for this slice (see PR body). Closing the tab and reloading just shows
 * the modal again.
 *
 * The same component is mounted in app.client, app.admin, and app.rescue
 * — admins and rescue staff are bound by the same ToS / Privacy as
 * adopters, so the hard block applies universally. Wording is deliberately
 * universal (no "as an admin" / "as rescue staff" copy).
 */

const LABELS: Record<PendingReacceptanceItem['documentType'], { title: string; href: string }> = {
  terms: { title: 'Terms of Service', href: '/terms' },
  privacy: { title: 'Privacy Policy', href: '/privacy' },
  cookies: { title: 'Cookies Policy', href: '/cookies' },
};

type Status = 'idle' | 'submitting' | 'error';

export const LegalReacceptanceModal = () => {
  const { isAuthenticated, user } = useAuth();
  const [pending, setPending] = useState<ReadonlyArray<PendingReacceptanceItem>>([]);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = user?.userId ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setPending([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const result = await fetchPendingReacceptance();
        if (cancelled) {
          return;
        }
        setPending(result.pending);
        setAccepted({});
        setStatus('idle');
      } catch {
        // Initial fetch failures are silent: better to let the user
        // continue using the app than to flash a hard-block modal we
        // can't justify. The next page load retries.
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const allChecked =
    pending.length > 0 && pending.every(item => accepted[item.documentType] === true);

  const handleToggle = (documentType: PendingReacceptanceItem['documentType']) => {
    setAccepted(prev => ({ ...prev, [documentType]: !prev[documentType] }));
  };

  const handleSubmit = async () => {
    if (!allChecked) {
      return;
    }
    setStatus('submitting');
    setErrorMessage(null);
    try {
      // Versions are intentionally omitted — the backend stamps the audit
      // row with the currently-published TERMS_VERSION / PRIVACY_VERSION,
      // which is exactly what "re-accept current" means.
      await recordReacceptance({
        tosAccepted: true,
        privacyAccepted: true,
      });
      setPending([]);
      setStatus('idle');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to record acceptance. Please try again.'
      );
      setStatus('error');
    }
  };

  if (!isAuthenticated || !userId || pending.length === 0) {
    return null;
  }

  // Hard block: no overlay-click / Escape / close-button dismiss.
  return (
    <Modal
      isOpen
      onClose={() => undefined}
      title='Updated legal documents'
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      data-testid='legal-reacceptance-modal'
    >
      <div className={styles.modalContent}>
        <p className={styles.description}>
          We&apos;ve updated the documents below. Please review and accept the latest versions to
          continue using Adopt Don&apos;t Shop.
        </p>

        <div className={styles.documentList}>
          {pending.map(item => {
            const meta = LABELS[item.documentType];
            return (
              <div key={item.documentType} className={styles.documentItem}>
                <label className={styles.documentLabel}>
                  <input
                    type='checkbox'
                    className={styles.checkbox}
                    checked={accepted[item.documentType] === true}
                    onChange={() => handleToggle(item.documentType)}
                    disabled={status === 'submitting'}
                    aria-label={`I accept the updated ${meta.title}`}
                  />
                  <span className={styles.documentTextBlock}>
                    <span className={styles.documentTitle}>I accept the updated {meta.title}</span>
                    <span className={styles.documentMeta}>
                      New version: {item.currentVersion}
                      {item.lastAcceptedVersion
                        ? ` (you previously accepted ${item.lastAcceptedVersion})`
                        : ' (first acceptance)'}
                    </span>
                    <a
                      className={styles.documentLink}
                      href={meta.href}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      Read full {meta.title}
                    </a>
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {status === 'error' && errorMessage && (
          <div className={styles.errorAlert}>
            <Alert variant='error' title='Something went wrong'>
              {errorMessage}
            </Alert>
          </div>
        )}

        <div className={styles.actionButtons}>
          <Button
            variant='primary'
            onClick={() => void handleSubmit()}
            disabled={!allChecked || status === 'submitting'}
          >
            {status === 'submitting' && <Spinner size='sm' className={styles.buttonSpinner} />}
            {status === 'submitting'
              ? 'Saving...'
              : status === 'error'
                ? 'Retry'
                : 'Accept and continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
