import React, { useCallback, useMemo } from 'react';
import { SanctionBanner, type ActiveSanction } from '@adopt-dont-shop/lib.components';
import { apiService } from '@/services/libraryServices';

/**
 * ADS C4-5: thin host that binds the lib.components <SanctionBanner /> to
 * this app's apiService. Sits at the top of the rescue Layout, above
 * the main-content target so the SkipLink still bypasses it.
 */
export const SanctionBannerHost: React.FC = () => {
  const fetchSanctions = useCallback(async (): Promise<ActiveSanction[]> => {
    const response = await apiService.get<{ sanctions: ActiveSanction[] }>(
      '/api/v1/auth/sanctions/active'
    );
    return response.sanctions ?? [];
  }, []);

  const acknowledgeSanction = useCallback(async (id: string): Promise<void> => {
    await apiService.post<void>(`/api/v1/auth/sanctions/${id}/acknowledge`);
  }, []);

  const props = useMemo(
    () => ({ fetchSanctions, acknowledgeSanction }),
    [fetchSanctions, acknowledgeSanction]
  );

  return <SanctionBanner {...props} />;
};
