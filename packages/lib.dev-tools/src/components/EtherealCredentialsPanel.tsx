import React from 'react';
import { useEtherealCredentials } from '../hooks/useEtherealCredentials';
import * as styles from './EtherealCredentialsPanel.css';

interface EtherealCredentialsPanelProps {
  className?: string;
}

/**
 * Development-only component that displays Ethereal email credentials
 * Automatically hidden in production builds
 */
export const EtherealCredentialsPanel: React.FC<EtherealCredentialsPanelProps> = ({
  className,
}) => {
  const { credentials, loading } = useEtherealCredentials();

  // Hide in production
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    process.env.NODE_ENV === 'production'
  ) {
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
    <div className={`${styles.etherealSection}${className ? ` ${className}` : ''}`}>
      <h4 className={styles.etherealHeader}>📧 Ethereal Email Testing</h4>
      {loading ? (
        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Loading credentials...</div>
      ) : credentials ? (
        <>
          <div className={styles.credentialRow}>
            <span className={styles.credentialLabel}>Username:</span>
            <span
              className={styles.credentialValue}
              onClick={() => copyToClipboard(credentials.user)}
              title="Click to copy"
            >
              {credentials.user}
            </span>
          </div>
          <div className={styles.credentialRow}>
            <span className={styles.credentialLabel}>Password:</span>
            <span
              className={styles.credentialValue}
              onClick={() => copyToClipboard(credentials.pass)}
              title="Click to copy"
            >
              {credentials.pass}
            </span>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <button
              className={styles.etherealButton}
              onClick={() => window.open(credentials.loginUrl, '_blank')}
            >
              🔐 Login to Ethereal
            </button>
            <button
              className={styles.etherealButton}
              onClick={() => window.open(credentials.messagesUrl, '_blank')}
            >
              📬 View Messages
            </button>
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
    </div>
  );
};
