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

  // ADS-1231: gate on Vite's build-time `import.meta.env.DEV` rather than a
  // runtime NODE_ENV/hostname check. It is statically replaced at build time,
  // so this component's body (and its live-credentials fetch) is dead-code-
  // eliminated from production bundles instead of merely hidden at runtime —
  // a mis-built non-prod bundle served on a real host can no longer leak the
  // shared test-inbox credentials.
  if (!import.meta.env?.DEV) {
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
              onClick={() => window.open(credentials.loginUrl, '_blank', 'noopener,noreferrer')}
            >
              🔐 Login to Ethereal
            </button>
            <button
              className={styles.etherealButton}
              onClick={() => window.open(credentials.messagesUrl, '_blank', 'noopener,noreferrer')}
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
