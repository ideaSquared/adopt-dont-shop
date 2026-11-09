import React, { useState } from 'react';
import { Alert, Button } from '@adopt-dont-shop/lib.components';
import { authService } from '../services/auth-service';
import { useAuth } from '../hooks/useAuth';
import { BackupCodesReveal } from './BackupCodesReveal';
import * as styles from './TwoFactorSettings.css';

// --- Component Types ---

export interface TwoFactorSettingsProps {
  onStatusChange?: (enabled: boolean) => void;
}

type SetupPhase = 'idle' | 'scanning' | 'verifying' | 'backup-codes';
type DisablePhase = 'idle' | 'confirming';
// ADS-914 follow-up: regenerating backup codes is gated on a current TOTP
// code, same pattern as disabling 2FA.
type RegeneratePhase = 'idle' | 'confirming';

// --- Component ---

export const TwoFactorSettings: React.FC<TwoFactorSettingsProps> = ({ onStatusChange }) => {
  const { user, refreshUser } = useAuth();
  const isEnabled = user?.twoFactorEnabled ?? false;

  // Setup state
  const [setupPhase, setSetupPhase] = useState<SetupPhase>('idle');
  const [secret, setSecret] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  // Distinguishes the enable-2FA reveal from the regenerate reveal so
  // BackupCodesReveal can show the right heading for each.
  const [backupCodesHeading, setBackupCodesHeading] = useState('Save your backup codes');

  // Disable state
  const [disablePhase, setDisablePhase] = useState<DisablePhase>('idle');
  const [disableToken, setDisableToken] = useState('');

  // Regenerate backup codes state
  const [regeneratePhase, setRegeneratePhase] = useState<RegeneratePhase>('idle');
  const [regenerateToken, setRegenerateToken] = useState('');

  // Shared state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.twoFactorSetup();
      setSecret(response.secret);
      setQrCodeDataUrl(response.qrCodeDataUrl);
      setSetupPhase('scanning');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'We could not start setting up. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verifyToken.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.twoFactorEnable(secret, verifyToken);
      setBackupCodes(response.backupCodes);
      setBackupCodesHeading('Save your backup codes');
      setSetupPhase('backup-codes');
      await refreshUser();
      onStatusChange?.(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'That code did not work. Check your app and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Dismisses the backup-codes reveal panel, whether it was shown after
  // enrolment or after a regeneration. Clears the plaintext codes from
  // state — nothing about them is persisted after this point.
  const handleFinishBackupCodesReveal = () => {
    setSetupPhase('idle');
    setSecret('');
    setQrCodeDataUrl('');
    setVerifyToken('');
    setBackupCodes([]);
  };

  const handleDisable = async () => {
    if (disableToken.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authService.twoFactorDisable(disableToken);
      setDisablePhase('idle');
      setDisableToken('');
      await refreshUser();
      onStatusChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not turn it off. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Starts the regenerate flow — a current TOTP code is required before the
  // server will mint a fresh set (ADS-914 follow-up).
  const handleStartRegenerate = () => {
    setError(null);
    setRegeneratePhase('confirming');
  };

  const handleConfirmRegenerate = async () => {
    if (regenerateToken.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.twoFactorRegenerateBackupCodes(regenerateToken);
      setBackupCodes(response.backupCodes);
      setBackupCodesHeading('Your new backup codes');
      setRegeneratePhase('idle');
      setRegenerateToken('');
      setSetupPhase('backup-codes');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'We could not make new backup codes. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRegenerate = () => {
    setRegeneratePhase('idle');
    setRegenerateToken('');
    setError(null);
  };

  const handleCancelSetup = () => {
    setSetupPhase('idle');
    setSecret('');
    setQrCodeDataUrl('');
    setVerifyToken('');
    setError(null);
  };

  const handleCancelDisable = () => {
    setDisablePhase('idle');
    setDisableToken('');
    setError(null);
  };

  // --- Render: 2FA Enabled State ---
  if (
    isEnabled &&
    disablePhase === 'idle' &&
    regeneratePhase === 'idle' &&
    setupPhase !== 'backup-codes'
  ) {
    return (
      <div className={styles.container}>
        <div>
          <span className={styles.statusBadge({ enabled: true })}>On</span>
        </div>
        <p className={styles.description}>
          Two-factor sign-in is on. Each time you sign in, we will also ask for the 6-digit code
          from the authenticator app on your phone.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className={styles.buttonRow}>
          <Button variant="secondary" onClick={handleStartRegenerate} disabled={isLoading}>
            Get new backup codes
          </Button>
          <Button variant="secondary" onClick={() => setDisablePhase('confirming')}>
            Turn off two-factor sign-in
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Regenerate Backup Codes Confirmation ---
  if (regeneratePhase === 'confirming') {
    return (
      <div className={styles.container}>
        <p className={styles.description}>
          Enter the 6-digit code from your authenticator app to get new backup codes. Your old
          backup codes will stop working straight away.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <label className={styles.description} htmlFor="regenerate-backup-codes-token">
          6-digit code
        </label>
        <input
          id="regenerate-backup-codes-token"
          className={styles.tokenInput}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={regenerateToken}
          onChange={(e) => setRegenerateToken(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        <div className={styles.buttonRow}>
          <Button
            onClick={handleConfirmRegenerate}
            disabled={isLoading || regenerateToken.length !== 6}
          >
            {isLoading ? 'Getting new codes…' : 'Get new codes'}
          </Button>
          <Button variant="secondary" onClick={handleCancelRegenerate} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Disable Confirmation ---
  if (disablePhase === 'confirming') {
    return (
      <div className={styles.container}>
        <p className={styles.description}>
          Enter the 6-digit code from your authenticator app to turn off two-factor sign-in.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <input
          className={styles.tokenInput}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={disableToken}
          onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        <div className={styles.buttonRow}>
          <Button onClick={handleDisable} disabled={isLoading || disableToken.length !== 6}>
            {isLoading ? 'Turning off…' : 'Turn off'}
          </Button>
          <Button variant="secondary" onClick={handleCancelDisable} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Backup Codes Reveal (shown once after enable or regenerate) ---
  if (setupPhase === 'backup-codes') {
    return (
      <div className={styles.container}>
        {isEnabled && (
          <div>
            <span className={styles.statusBadge({ enabled: true })}>On</span>
          </div>
        )}
        <BackupCodesReveal
          codes={backupCodes}
          heading={backupCodesHeading}
          onDismiss={handleFinishBackupCodesReveal}
        />
      </div>
    );
  }

  // --- Render: Setup - Scanning QR Code ---
  if (setupPhase === 'scanning') {
    return (
      <div className={styles.container}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className={styles.setupStep}>
          <div className={styles.stepHeader}>
            <div className={styles.stepNumber}>1</div>
            Scan this code with the authenticator app on your phone
          </div>
          <p className={styles.description}>
            Use an app like Google Authenticator, Authy, or Microsoft Authenticator.
          </p>
          <img
            className={styles.qrCodeImage}
            src={qrCodeDataUrl}
            alt="QR code for your authenticator app"
          />
        </div>

        <div className={styles.setupStep}>
          <div className={styles.stepHeader}>
            <div className={styles.stepNumber}>2</div>
            Can't scan it? Type this key into the app instead
          </div>
          <code className={styles.secretKey}>{secret}</code>
        </div>

        <div className={styles.setupStep}>
          <div className={styles.stepHeader}>
            <div className={styles.stepNumber}>3</div>
            Enter the 6-digit code from your app
          </div>
          <input
            className={styles.tokenInput}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </div>

        <div className={styles.buttonRow}>
          <Button onClick={handleVerifyAndEnable} disabled={isLoading || verifyToken.length !== 6}>
            {isLoading ? 'Turning on…' : 'Turn on'}
          </Button>
          <Button variant="secondary" onClick={handleCancelSetup} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Idle / Not Enabled ---
  return (
    <div className={styles.container}>
      <div>
        <span className={styles.statusBadge({ enabled: false })}>Off</span>
      </div>
      <p className={styles.description}>
        Keep your account safer. As well as your password, we will ask for a 6-digit code from an
        authenticator app on your phone when you sign in.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <Button onClick={handleStartSetup} disabled={isLoading}>
          {isLoading ? 'Starting…' : 'Turn on two-factor sign-in'}
        </Button>
      </div>
    </div>
  );
};
