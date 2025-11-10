import React from 'react';
import styled from 'styled-components';
import { useEtherealCredentials } from '../hooks/useEtherealCredentials';

const EtherealSection = styled.div`
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border: 1px solid #7dd3fc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #0ea5e9, #06b6d4);
    border-radius: 12px 12px 0 0;
  }
`;

const EtherealHeader = styled.h4`
  margin: 0 0 1rem 0;
  color: #0c4a6e;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: '📧';
    font-size: 1.2rem;
  }
`;

const CredentialRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
`;

const CredentialLabel = styled.span`
  color: #64748b;
  font-weight: 500;
`;

const CredentialValue = styled.span`
  color: #1e293b;
  font-family: 'Courier New', monospace;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 1);
  }
`;

const EtherealButton = styled.button`
  background: #0ea5e9;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s ease;

  &:hover {
    background: #0284c7;
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
`;

interface EtherealCredentialsPanelProps {
  className?: string;
}

/**
 * Development-only component that displays Ethereal email credentials
 * Automatically hidden in production builds
 */
export const EtherealCredentialsPanel: React.FC<EtherealCredentialsPanelProps> = ({
  className
}) => {
  const { credentials, loading } = useEtherealCredentials();

  // Hide in production
  if (typeof window !== 'undefined' &&
      window.location &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      process.env.NODE_ENV === 'production') {
    return null;
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here in the future
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <EtherealSection className={className}>
      <EtherealHeader>
        📧 Ethereal Email Testing
      </EtherealHeader>
      {loading ? (
        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Loading credentials...</div>
      ) : credentials ? (
        <>
          <CredentialRow>
            <CredentialLabel>Username:</CredentialLabel>
            <CredentialValue
              onClick={() => copyToClipboard(credentials.user)}
              title="Click to copy"
            >
              {credentials.user}
            </CredentialValue>
          </CredentialRow>
          <CredentialRow>
            <CredentialLabel>Password:</CredentialLabel>
            <CredentialValue
              onClick={() => copyToClipboard(credentials.pass)}
              title="Click to copy"
            >
              {credentials.pass}
            </CredentialValue>
          </CredentialRow>
          <div style={{ marginTop: '0.75rem' }}>
            <EtherealButton
              onClick={() => window.open(credentials.loginUrl, '_blank')}
            >
              🔐 Login to Ethereal
            </EtherealButton>
            <EtherealButton
              onClick={() => window.open(credentials.messagesUrl, '_blank')}
            >
              📬 View Messages
            </EtherealButton>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
            Use these credentials to access test emails on Ethereal.email
          </div>
        </>
      ) : (
        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
          📧 Mock ethereal credentials loaded for development
        </div>
      )}
    </EtherealSection>
  );
};
