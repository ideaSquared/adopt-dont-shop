import { useState, useEffect } from 'react';
import { DevUser } from '../components/DevPanel';
import { isDevelopmentMode } from '../index';

interface UseSeededUsersOptions {
  userTypes?: string[];
  fallbackToLocal?: boolean;
}

interface UseSeededUsersReturn {
  users: DevUser[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch seeded dev users from the backend API
 * Falls back to local data if API is unavailable
 */
export const useSeededUsers = (options: UseSeededUsersOptions = {}): UseSeededUsersReturn => {
  const { userTypes, fallbackToLocal = true } = options;
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    // Only fetch in development
    if (!isDevelopmentMode()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API first
      const response = await fetch('/api/dev/seeded-users', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredUsers = data.users || [];

        // Filter by user types if specified
        if (userTypes && userTypes.length > 0) {
          filteredUsers = filteredUsers.filter((user: DevUser) =>
            userTypes.includes(user.userType)
          );
        }

        setUsers(filteredUsers);
      } else {
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (err) {
      console.warn('Failed to fetch seeded users from API:', err);

      if (fallbackToLocal) {
        // Fallback to local data
        const { getDevUsersByType, seededDevUsers } = await import('../data/seededUsers');
        const fallbackUsers =
          userTypes && userTypes.length > 0 ? getDevUsersByType(userTypes) : seededDevUsers;

        setUsers(fallbackUsers);
        setError('Using local data - API unavailable');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userTypes?.join(',')]); // Re-fetch if user types change

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
};
