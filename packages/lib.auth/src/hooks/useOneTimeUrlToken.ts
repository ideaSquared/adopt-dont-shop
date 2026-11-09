import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Captures a single-use token from the URL once, then strips it from the
 * address bar (ADS-1012) so it doesn't linger in browser history or ride out
 * on Referer headers. The token is held in state, so the URL rewrite doesn't
 * pull it out from under the submit/verify handler. Returns null when the URL
 * carried no token.
 */
export const useOneTimeUrlToken = (paramName = 'token'): string | null => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get(paramName));

  useEffect(() => {
    if (!searchParams.has(paramName)) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete(paramName);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, paramName]);

  return token;
};
