import { apiService } from '@adopt-dont-shop/lib.api';
import { SanctionBanner, toast, type ActiveSanction } from '@adopt-dont-shop/lib.components';
import React from 'react';

const fetchSanctions = async (): Promise<ActiveSanction[]> => {
  const response = await apiService.get<{ sanctions?: ActiveSanction[] }>(
    '/api/v1/auth/sanctions/active'
  );
  return response.sanctions ?? [];
};

const acknowledgeSanction = async (id: string): Promise<void> => {
  try {
    await apiService.post<void>(`/api/v1/auth/sanctions/${id}/acknowledge`);
    toast.success('Sanction acknowledged');
  } catch (error) {
    toast.error('Failed to acknowledge sanction');
    throw error;
  }
};

/**
 * Binds lib.components' <SanctionBanner /> to the shared apiService and gives the
 * user toast feedback when acknowledging. Mount it at the top of an app's layout,
 * above the main-content target so the SkipLink still bypasses it.
 */
export const SanctionBannerHost: React.FC = () => (
  <SanctionBanner fetchSanctions={fetchSanctions} acknowledgeSanction={acknowledgeSanction} />
);
