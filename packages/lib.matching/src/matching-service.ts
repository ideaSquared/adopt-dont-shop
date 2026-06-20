import { ApiService } from '@adopt-dont-shop/lib.api';

import type { AdopterMatchProfile, MatchTopPick } from './index';

/**
 * Client for the adopter-matching API surface served by the gateway
 * (`/api/v1/match/*`). Wraps the top-picks read and the match-profile
 * read/write so the app.client components stop hand-rolling `apiService`
 * calls and share one typed contract.
 */
export class MatchingService {
  private readonly apiService: ApiService;

  constructor(apiService: ApiService = new ApiService()) {
    this.apiService = apiService;
  }

  /**
   * Personalised "top picks" scored against the adopter's stored match
   * profile. Returns an empty list when the user has no picks yet.
   */
  async getTopPicks(limit = 10): Promise<MatchTopPick[]> {
    const res = await this.apiService.get<{ data: MatchTopPick[] }>(
      `/api/v1/match/top-picks?limit=${limit}`
    );
    return res.data ?? [];
  }

  /** The signed-in adopter's saved match profile, or null when unset. */
  async getMatchProfile(): Promise<Partial<AdopterMatchProfile> | null> {
    const res = await this.apiService.get<{ data: Partial<AdopterMatchProfile> }>(
      '/api/v1/match/profile'
    );
    return res.data ?? null;
  }

  /** Upsert the adopter's match profile (onboarding wizard save). */
  async updateMatchProfile(profile: Partial<AdopterMatchProfile>): Promise<void> {
    await this.apiService.put('/api/v1/match/profile', profile);
  }
}
