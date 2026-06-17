import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string, params?: unknown) => Promise<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
}));

import { fosterService } from './fosterService';

/**
 * Behaviour tests for the foster placement service. Foster coordination tracks
 * which pets are placed with foster carers and how placements end. The service
 * must forward status filters and unwrap the API's `{ data }` envelope.
 */
describe('fosterService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('list', () => {
    it('fetches placements without params when no filter is supplied', async () => {
      apiServiceMock.get.mockResolvedValue({ data: [] });

      const result = await fosterService.list();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/foster/placements', undefined);
      expect(result).toEqual([]);
    });

    it('forwards a status filter to the backend', async () => {
      apiServiceMock.get.mockResolvedValue({ data: [{ placementId: 'p1' }] });

      const result = await fosterService.list({ status: 'active' });

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/foster/placements', {
        status: 'active',
      });
      expect(result).toEqual([{ placementId: 'p1' }]);
    });
  });

  describe('create', () => {
    it('posts a new placement and returns it', async () => {
      const placement = { placementId: 'p2', petId: 'pet1' };
      apiServiceMock.post.mockResolvedValue({ data: placement });

      const input = {
        petId: 'pet1',
        fosterUserId: 'u1',
        rescueId: 'r1',
        startDate: '2024-01-01',
      };
      const result = await fosterService.create(input);

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/foster/placements', input);
      expect(result).toEqual(placement);
    });
  });

  describe('end', () => {
    it('posts the outcome to the placement end endpoint', async () => {
      const ended = { placementId: 'p1', status: 'completed' };
      apiServiceMock.post.mockResolvedValue({ data: ended });

      const result = await fosterService.end('p1', { outcome: 'adopted_by_foster' });

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/foster/placements/p1/end', {
        outcome: 'adopted_by_foster',
      });
      expect(result).toEqual(ended);
    });
  });
});
