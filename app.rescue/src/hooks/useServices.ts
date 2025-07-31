import { useMemo } from 'react';
import { SearchService } from '@adopt-dont-shop/lib-search';
import { UtilsService } from '@adopt-dont-shop/lib-utils';

/**
 * Hook that provides access to all utility services
 */
export const useServices = () => {
  const searchService = useMemo(() => {
    return new SearchService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development',
    });
  }, []);

  const utilsService = useMemo(() => {
    return new UtilsService({
      debug: import.meta.env.NODE_ENV === 'development',
    });
  }, []);

  return {
    searchService,
    utilsService,
  };
};
