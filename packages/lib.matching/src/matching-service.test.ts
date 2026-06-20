import { describe, expect, it, vi } from 'vitest';

import type { ApiService } from '@adopt-dont-shop/lib.api';

import { MatchingService } from './matching-service';

type ApiStub = { get?: ReturnType<typeof vi.fn>; put?: ReturnType<typeof vi.fn> };

const makeApi = (stub: ApiStub = {}): ApiService =>
  ({ get: stub.get ?? vi.fn(), put: stub.put ?? vi.fn() }) as unknown as ApiService;

describe('MatchingService', () => {
  describe('getTopPicks', () => {
    it('requests the picks with the given limit and unwraps the data envelope', async () => {
      const picks = [{ petId: 'p-1', name: 'Bella', reasons: [] }];
      const get = vi.fn().mockResolvedValue({ data: picks });
      const service = new MatchingService(makeApi({ get }));

      const result = await service.getTopPicks(5);

      expect(get).toHaveBeenCalledWith('/api/v1/match/top-picks?limit=5');
      expect(result).toEqual(picks);
    });

    it('defaults the limit to 10 when none is given', async () => {
      const get = vi.fn().mockResolvedValue({ data: [] });
      const service = new MatchingService(makeApi({ get }));

      await service.getTopPicks();

      expect(get).toHaveBeenCalledWith('/api/v1/match/top-picks?limit=10');
    });

    it('returns an empty array when the response carries no data', async () => {
      const get = vi.fn().mockResolvedValue({});
      const service = new MatchingService(makeApi({ get }));

      expect(await service.getTopPicks()).toEqual([]);
    });
  });

  describe('getMatchProfile', () => {
    it('unwraps the profile data envelope', async () => {
      const profile = { user_id: 'u-1', preferred_types: ['dog'] };
      const get = vi.fn().mockResolvedValue({ data: profile });
      const service = new MatchingService(makeApi({ get }));

      const result = await service.getMatchProfile();

      expect(get).toHaveBeenCalledWith('/api/v1/match/profile');
      expect(result).toEqual(profile);
    });

    it('returns null when the response carries no profile', async () => {
      const get = vi.fn().mockResolvedValue({});
      const service = new MatchingService(makeApi({ get }));

      expect(await service.getMatchProfile()).toBeNull();
    });
  });

  describe('updateMatchProfile', () => {
    it('PUTs the profile payload to the match profile endpoint', async () => {
      const put = vi.fn().mockResolvedValue({});
      const service = new MatchingService(makeApi({ put }));
      const payload = { preferred_types: ['cat'], open_to_special_needs: true };

      await service.updateMatchProfile(payload);

      expect(put).toHaveBeenCalledWith('/api/v1/match/profile', payload);
    });
  });
});
