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
      window.location &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        process.env.NODE_ENV === 'development')
    ) {
      const fetchCredentials = async () => {
        try {
          const response = await fetch('/api/v1/email/provider-info');
          if (response.ok) {
            const raw: unknown = await response.json();
            // Guard required fields before storing in state
            const isValidCredentials = (v: unknown): v is EtherealCredentials =>
              v !== null &&
              typeof v === 'object' &&
              typeof (v as Record<string, unknown>).provider === 'string' &&
              typeof (v as Record<string, unknown>).user === 'string' &&
              typeof (v as Record<string, unknown>).pass === 'string' &&
              typeof (v as Record<string, unknown>).loginUrl === 'string' &&
              typeof (v as Record<string, unknown>).messagesUrl === 'string';
            setCredentials(
              isValidCredentials(raw)
                ? raw
                : {
                    provider: 'ethereal.email',
                    user: 'dev@ethereal.email',
                    pass: 'mock-password',
                    loginUrl: 'https://ethereal.email/login',
                    messagesUrl: 'https://ethereal.email/messages',
                  }
            );
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
