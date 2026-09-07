import { describe, expect, it, vi } from 'vitest';
import { apiService } from '@adopt-dont-shop/lib.api';

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { fetchLegalDocument } from './legal-service';

describe('fetchLegalDocument', () => {
  it('fetches and validates the versioned document for a slug', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        version: '2026-05-10-v1',
        contentType: 'text/markdown',
        content: '# Terms\n\nBody text.',
      },
    });

    const result = await fetchLegalDocument('terms');

    expect(apiService.get).toHaveBeenCalledWith('/api/v1/legal/terms');
    expect(result).toEqual({
      version: '2026-05-10-v1',
      contentType: 'text/markdown',
      content: '# Terms\n\nBody text.',
    });
  });

  it('rejects a malformed response', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({ data: { version: '' } });

    await expect(fetchLegalDocument('cookies')).rejects.toThrow();
  });
});
