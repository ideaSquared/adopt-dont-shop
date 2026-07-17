import React, { useEffect, useId, useRef, useState } from 'react';
import { Button, CheckboxInput } from '@adopt-dont-shop/lib.components';
import * as styles from './BackupCodesReveal.css';

export interface BackupCodesRevealProps {
  /**
   * The plaintext backup codes to display. These are shown exactly once —
   * the caller must discard them from its own state once `onDismiss` fires.
   */
  codes: string[];
  /**
   * Called once the user has confirmed (via the required checkbox) that
   * they've saved the codes. The caller is responsible for clearing `codes`
   * from state at this point so the plaintext values aren't retained
   * anywhere after dismissal.
   */
  onDismiss: () => void;
  /**
   * Heading shown above the codes. Defaults to the enrolment copy; callers
   * showing a freshly-regenerated set can pass something more specific.
   */
  heading?: string;
}

const DOWNLOAD_FILENAME = 'adopt-dont-shop-backup-codes.txt';

/**
 * Reveal-once display for 2FA backup/recovery codes (ADS-914 follow-up).
 *
 * Shared by the enable-2FA flow and the regenerate-backup-codes flow in
 * TwoFactorSettings — both show a freshly-minted, plaintext set of codes
 * exactly once. The panel can't be dismissed until the user explicitly
 * confirms they've saved the codes, and nothing here persists the plaintext
 * codes beyond the caller's own transient state (no localStorage/etc).
 */
export const BackupCodesReveal: React.FC<BackupCodesRevealProps> = ({
  codes,
  onDismiss,
  heading = 'Save your backup codes',
}) => {
  const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [liveMessage, setLiveMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const checkboxId = useId();

  // Move focus to the heading as soon as the codes are revealed, and
  // announce the reveal for screen reader users who aren't tracking focus.
  useEffect(() => {
    headingRef.current?.focus();
    setLiveMessage(
      `${codes.length} backup codes generated. Save them now — they will not be shown again.`
    );
    // Only run once per reveal (a fresh mount happens for each new set of codes).
  }, []);

  const codesText = codes.join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codesText);
      setCopyStatus('copied');
      setLiveMessage('Backup codes copied to clipboard.');
    } catch {
      setCopyStatus('error');
      setLiveMessage('Could not copy backup codes. Please copy them manually.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = DOWNLOAD_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLiveMessage('Backup codes downloaded as a text file.');
  };

  return (
    <div className={styles.container} role="region" aria-labelledby={headingId}>
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className={styles.heading}>
        {heading}
      </h3>
      <p className={styles.warningBox}>
        These codes are shown only once. Save them somewhere safe — each code can be used a single
        time to sign in if you lose access to your authenticator app.
      </p>
      <ul className={styles.codesList} aria-label="Your backup codes">
        {codes.map((code) => (
          <li key={code} className={styles.codeItem}>
            <code>{code}</code>
          </li>
        ))}
      </ul>
      <div className={styles.buttonRow}>
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copyStatus === 'copied' ? 'Copied' : 'Copy codes'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleDownload}>
          Download as text
        </Button>
      </div>
      <div role="status" aria-live="polite" className={styles.srOnly}>
        {liveMessage}
      </div>
      <CheckboxInput
        id={checkboxId}
        label="I've saved these backup codes somewhere safe"
        checked={hasConfirmedSaved}
        onChange={(e) => setHasConfirmedSaved(e.target.checked)}
      />
      <Button type="button" onClick={onDismiss} disabled={!hasConfirmedSaved}>
        Done
      </Button>
    </div>
  );
};

export default BackupCodesReveal;
