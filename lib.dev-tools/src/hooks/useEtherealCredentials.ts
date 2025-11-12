import { useState, useEffect } from 'react';

interface EtherealCredentials {
  provider: string;
  user: string;
  pass: string;
  loginUrl: string;
  messagesUrl: string;
}

/**
 * Hook to fetch Ethereal email credentials for development testing
 * Only works in development mode
 */
export const useEtherealCredentials = () => {
  const [credentials, setCredentials] = useState<EtherealCredentials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch in development mode
    if (
      typeof window !== 'undefined' &&
      (window as any).location &&
      ((window as any).location.hostname === 'localhost' ||
        (window as any).location.hostname === '127.0.0.1' ||
        process.env.NODE_ENV === 'development')
    ) {
      const fetchCredentials = async () => {
        try {
          const response = await fetch('/api/dev/email/provider-info');
          if (response.ok) {
            const data = await response.json();
            setCredentials(data);
          } else {
            // Provide fallback mock credentials for development
            setCredentials({
              provider: 'ethereal.email',
              user: 'dev@ethereal.email',
              pass: 'mock-password',
              loginUrl: 'https://ethereal.email/login',
              messagesUrl: 'https://ethereal.email/messages',
            });
          }
        } catch (err) {
          // Provide fallback mock credentials when endpoint doesn't exist
          setCredentials({
            provider: 'ethereal.email (mock)',
            user: 'dev@ethereal.email',
            pass: 'mock-password',
            loginUrl: 'https://ethereal.email/login',
            messagesUrl: 'https://ethereal.email/messages',
          });
          console.warn('Ethereal credentials endpoint not available, using mock data:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchCredentials();
    } else {
      // In production, don't fetch anything
      setLoading(false);
      setCredentials(null);
    }
  }, []);

  return { credentials, loading };
};
