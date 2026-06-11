import React, { useState } from 'react';
import { Alert, Button } from '@adopt-dont-shop/lib.components';
import { authService } from '../services/auth-service';
import { useAuth } from '../hooks/useAuth';
import * as styles from './TwoFactorSettings.css';

// --- Component Types ---

export interface TwoFactorSettingsProps {
  onStatusChange?: (enabled: boolean) => void;
}

type SetupPhase = 'idle' | 'scanning' | 'verifying' | 'backup-codes';
type DisablePhase = 'idle' | 'confirming';

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

  // Disable state
  const [disablePhase, setDisablePhase] = useState<DisablePhase>('idle');
  const [disableToken, setDisableToken] = useState('');

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
      setError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
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
      setSetupPhase('backup-codes');
      await refreshUser();
      onStatusChange?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSetup = () => {
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
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.twoFactorRegenerateBackupCodes();
      setBackupCodes(response.backupCodes);
      setSetupPhase('backup-codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
    } finally {
      setIsLoading(false);
    }
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
  if (isEnabled && disablePhase === 'idle' && setupPhase !== 'backup-codes') {
    return (
      <div className={styles.container}>
        <div>
          <span className={styles.statusBadge({ enabled: true })}>Enabled</span>
        </div>
        <p className={styles.description}>
          Two-factor authentication is active on your account. You will be asked for a verification
          code from your authenticator app each time you sign in.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className={styles.buttonRow}>
          <Button variant="secondary" onClick={handleRegenerateBackupCodes} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Regenerate Backup Codes'}
          </Button>
          <Button variant="secondary" onClick={() => setDisablePhase('confirming')}>
            Disable 2FA
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
          Enter a code from your authenticator app to confirm disabling two-factor authentication.
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
            {isLoading ? 'Disabling...' : 'Confirm Disable'}
          </Button>
          <Button variant="secondary" onClick={handleCancelDisable} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Backup Codes Display ---
  if (setupPhase === 'backup-codes') {
    return (
      <div className={styles.container}>
        {isEnabled && (
          <div>
            <span className={styles.statusBadge({ enabled: true })}>Enabled</span>
          </div>
        )}
        <div className={styles.warningBox}>
          Save these backup codes in a safe place. Each code can only be used once. If you lose
          access to your authenticator app, you can use one of these codes to sign in.
        </div>
        <div className={styles.backupCodesGrid}>
          {backupCodes.map((code) => (
            <code className={styles.backupCode} key={code}>
              {code}
            </code>
          ))}
        </div>
        <Button onClick={handleFinishSetup}>I have saved my backup codes</Button>
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
            Scan this QR code with your authenticator app
          </div>
          <p className={styles.description}>
            Use an app like Google Authenticator, Authy, or Microsoft Authenticator.
          </p>
          <img className={styles.qrCodeImage} src={qrCodeDataUrl} alt="2FA QR Code" />
        </div>

        <div className={styles.setupStep}>
          <div className={styles.stepHeader}>
            <div className={styles.stepNumber}>2</div>
            Or enter this secret key manually
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
            {isLoading ? 'Verifying...' : 'Verify and Enable'}
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
        <span className={styles.statusBadge({ enabled: false })}>Disabled</span>
      </div>
      <p className={styles.description}>
        Add an extra layer of security to your account by requiring a verification code from your
        authenticator app when you sign in.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <Button onClick={handleStartSetup} disabled={isLoading}>
          {isLoading ? 'Setting up...' : 'Set Up Two-Factor Authentication'}
        </Button>
      </div>
    </div>
  );
};

export default TwoFactorSettings;
