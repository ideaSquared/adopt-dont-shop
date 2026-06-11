import { useState, useEffect } from 'react';

interface EtherealCredentials {
  provider: string;
  user: string;
  pass: string;
  loginUrl: string;
  messagesUrl: string;
}

export const useEtherealCredentials = () => {
  const [credentials, setCredentials] = useState<EtherealCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await fetch('/monitoring/api/email/provider-info');
        if (response.ok) {
          const data = await response.json();
          setCredentials(data);
        } else {
          setError('Failed to fetch ethereal credentials');
        }
      } catch (err) {
        setError('Error fetching ethereal credentials');
        console.error('Error fetching ethereal credentials:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, []);

  return { credentials, loading, error };
};
