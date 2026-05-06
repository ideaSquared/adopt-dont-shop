import { useEffect, useRef, useState } from 'react';
import { DevUser } from '../components/DevPanel';
import { isDevelopmentMode } from '../index';

interface UseSeededUsersOptions {
  /** Filter by user type (admin, moderator, rescue_staff, adopter, …). */
  userTypes?: string[];
  /** Optional search query — matched server-side against firstName / lastName / email. */
  query?: string;
  /** Max number of users to fetch (server caps at 500). */
  limit?: number;
  /** Debounce delay for the search query in ms. */
  debounceMs?: number;
  /** Fall back to bundled local data if the API is unreachable. */
  fallbackToLocal?: boolean;
}

interface UseSeededUsersReturn {
  users: DevUser[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches dev-loginable users from the backend. The endpoint queries the
 * live DB so faker-generated seeded users (e.g. @demo.test) are returned
 * alongside the canonical hand-authored accounts.
 *
 * Falls back to a small bundled list (canonical accounts only) if the
 * monitoring endpoint is unavailable.
 */
export const useSeededUsers = (options: UseSeededUsersOptions = {}): UseSeededUsersReturn => {
  const { userTypes, query, limit, debounceMs = 200, fallbackToLocal = true } = options;
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buildUrl = (q: string | undefined): string => {
    const params = new URLSearchParams();
    if (userTypes && userTypes.length > 0) {
      params.set('userType', userTypes.join(','));
    }
    if (q && q.trim().length > 0) {
      params.set('q', q.trim());
    }
    if (limit !== undefined && limit > 0) {
      params.set('limit', String(limit));
    }
    const qs = params.toString();
    return qs.length > 0
      ? `/monitoring/api/dev/seeded-users?${qs}`
      : '/monitoring/api/dev/seeded-users';
  };

  const fetchUsers = async (q: string | undefined): Promise<void> => {
    if (!isDevelopmentMode()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildUrl(q), {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        return;
      }
      console.warn('Failed to fetch seeded users from API:', err);

      if (fallbackToLocal) {
        const { getDevUsersByType, seededDevUsers } = await import('../data/seededUsers');
        const fallbackUsers =
          userTypes && userTypes.length > 0 ? getDevUsersByType(userTypes) : seededDevUsers;
        setUsers(fallbackUsers);
        setError('Using local data — API unavailable');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce the search query so each keystroke doesn't hit the backend.
  // userTypes / limit changes fire immediately.
  const userTypesKey = userTypes?.join(',') ?? '';
  useEffect(() => {
    const handle = setTimeout(
      () => {
        void fetchUsers(query);
      },
      query ? debounceMs : 0
    );
    return () => clearTimeout(handle);
  }, [userTypesKey, query, limit, debounceMs]);

  return {
    users,
    loading,
    error,
    refetch: () => void fetchUsers(query),
  };
};
