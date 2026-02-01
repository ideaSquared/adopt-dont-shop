import React, { useState } from 'react';
import { Alert, Button } from '@adopt-dont-shop/lib.components';
import styled from 'styled-components';
import { authService } from '../services/auth-service';
import { useAuth } from '../hooks/useAuth';

// --- Styled Components ---

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const StatusBadge = styled.span<{ $enabled: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.$enabled
      ? props.theme?.colors?.semantic?.success?.[100] || '#dcfce7'
      : props.theme?.colors?.neutral?.[100] || '#f3f4f6'};
  color: ${(props) =>
    props.$enabled
      ? props.theme?.colors?.semantic?.success?.[700] || '#15803d'
      : props.theme?.colors?.neutral?.[600] || '#4b5563'};
`;

const SetupStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StepNumber = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${(props) => props.theme?.colors?.primary?.[500] || '#2563eb'};
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  color: ${(props) => props.theme?.text?.primary || '#111827'};
`;

const QrCodeImage = styled.img`
  display: block;
  max-width: 200px;
  height: auto;
  border: 1px solid ${(props) => props.theme?.border?.color?.primary || '#e5e7eb'};
  border-radius: 8px;
  padding: 0.5rem;
  background: white;
`;

const SecretKey = styled.code`
  display: block;
  padding: 0.75rem;
  background: ${(props) => props.theme?.background?.secondary || '#f9fafb'};
  border: 1px solid ${(props) => props.theme?.border?.color?.primary || '#e5e7eb'};
  border-radius: 6px;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  word-break: break-all;
  user-select: all;
`;

const TokenInput = styled.input`
  padding: 0.75rem;
  border: 1px solid ${(props) => props.theme?.border?.color?.primary || '#e5e7eb'};
  border-radius: 6px;
  font-size: 1.25rem;
  letter-spacing: 0.3em;
  text-align: center;
  max-width: 200px;
  background: ${(props) => props.theme?.background?.primary || '#ffffff'};
  color: ${(props) => props.theme?.text?.primary || '#111827'};

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme?.colors?.primary?.[500] || '#2563eb'};
    box-shadow: 0 0 0 2px ${(props) => props.theme?.colors?.primary?.[100] || '#dbeafe'};
  }
`;

const BackupCodesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-width: 320px;
`;

const BackupCode = styled.code`
  padding: 0.5rem 0.75rem;
  background: ${(props) => props.theme?.background?.secondary || '#f9fafb'};
  border: 1px solid ${(props) => props.theme?.border?.color?.primary || '#e5e7eb'};
  border-radius: 4px;
  font-size: 0.875rem;
  text-align: center;
  letter-spacing: 0.05em;
`;

const Description = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme?.text?.secondary || '#6b7280'};
  margin: 0;
  line-height: 1.5;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const WarningBox = styled.div`
  padding: 1rem;
  background: ${(props) => props.theme?.colors?.semantic?.warning?.[50] || '#fffbeb'};
  border: 1px solid ${(props) => props.theme?.colors?.semantic?.warning?.[300] || '#fcd34d'};
  border-radius: 6px;
  font-size: 0.875rem;
  color: ${(props) => props.theme?.colors?.semantic?.warning?.[800] || '#92400e'};
`;

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
      <Container>
        <div>
          <StatusBadge $enabled>Enabled</StatusBadge>
        </div>
        <Description>
          Two-factor authentication is active on your account. You will be asked for a verification
          code from your authenticator app each time you sign in.
        </Description>
        {error && <Alert variant="error">{error}</Alert>}
        <ButtonRow>
          <Button variant="secondary" onClick={handleRegenerateBackupCodes} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Regenerate Backup Codes'}
          </Button>
          <Button variant="secondary" onClick={() => setDisablePhase('confirming')}>
            Disable 2FA
          </Button>
        </ButtonRow>
      </Container>
    );
  }

  // --- Render: Disable Confirmation ---
  if (disablePhase === 'confirming') {
    return (
      <Container>
        <Description>
          Enter a code from your authenticator app to confirm disabling two-factor authentication.
        </Description>
        {error && <Alert variant="error">{error}</Alert>}
        <TokenInput
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={disableToken}
          onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        <ButtonRow>
          <Button onClick={handleDisable} disabled={isLoading || disableToken.length !== 6}>
            {isLoading ? 'Disabling...' : 'Confirm Disable'}
          </Button>
          <Button variant="secondary" onClick={handleCancelDisable} disabled={isLoading}>
            Cancel
          </Button>
        </ButtonRow>
      </Container>
    );
  }

  // --- Render: Backup Codes Display ---
  if (setupPhase === 'backup-codes') {
    return (
      <Container>
        {isEnabled && (
          <div>
            <StatusBadge $enabled>Enabled</StatusBadge>
          </div>
        )}
        <WarningBox>
          Save these backup codes in a safe place. Each code can only be used once. If you lose
          access to your authenticator app, you can use one of these codes to sign in.
        </WarningBox>
        <BackupCodesGrid>
          {backupCodes.map((code) => (
            <BackupCode key={code}>{code}</BackupCode>
          ))}
        </BackupCodesGrid>
        <Button onClick={handleFinishSetup}>
          I have saved my backup codes
        </Button>
      </Container>
    );
  }

  // --- Render: Setup - Scanning QR Code ---
  if (setupPhase === 'scanning') {
    return (
      <Container>
        {error && <Alert variant="error">{error}</Alert>}

        <SetupStep>
          <StepHeader>
            <StepNumber>1</StepNumber>
            Scan this QR code with your authenticator app
          </StepHeader>
          <Description>
            Use an app like Google Authenticator, Authy, or Microsoft Authenticator.
          </Description>
          <QrCodeImage src={qrCodeDataUrl} alt="2FA QR Code" />
        </SetupStep>

        <SetupStep>
          <StepHeader>
            <StepNumber>2</StepNumber>
            Or enter this secret key manually
          </StepHeader>
          <SecretKey>{secret}</SecretKey>
        </SetupStep>

        <SetupStep>
          <StepHeader>
            <StepNumber>3</StepNumber>
            Enter the 6-digit code from your app
          </StepHeader>
          <TokenInput
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </SetupStep>

        <ButtonRow>
          <Button
            onClick={handleVerifyAndEnable}
            disabled={isLoading || verifyToken.length !== 6}
          >
            {isLoading ? 'Verifying...' : 'Verify and Enable'}
          </Button>
          <Button variant="secondary" onClick={handleCancelSetup} disabled={isLoading}>
            Cancel
          </Button>
        </ButtonRow>
      </Container>
    );
  }

  // --- Render: Idle / Not Enabled ---
  return (
    <Container>
      <div>
        <StatusBadge $enabled={false}>Disabled</StatusBadge>
      </div>
      <Description>
        Add an extra layer of security to your account by requiring a verification code from your
        authenticator app when you sign in.
      </Description>
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <Button onClick={handleStartSetup} disabled={isLoading}>
          {isLoading ? 'Setting up...' : 'Set Up Two-Factor Authentication'}
        </Button>
      </div>
    </Container>
  );
};

export default TwoFactorSettings;
