/**
 * Behavioural tests for the public CMS service.
 *
 * Verifies the URLs / query params the adopter portal sends when listing and
 * reading blog posts, help articles and static pages, and that the single
 * `content` wrapper returned by the backend is unwrapped for callers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiGet = vi.fn();

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}));

import { cmsPublicService, type PublicContent } from './cmsService';

const samplePost: PublicContent = {
  contentId: 'c-1',
  title: 'Adopting a senior dog',
  slug: 'adopting-a-senior-dog',
  contentType: 'blog_post',
  content: '<p>...</p>',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('listBlogPosts', () => {
  it('requests blog_post content with default pagination', async () => {
    apiGet.mockResolvedValue({
      content: [samplePost],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });

    const result = await cmsPublicService.listBlogPosts();

    expect(apiGet).toHaveBeenCalledWith('/api/v1/cms/public/content', {
      contentType: 'blog_post',
      page: 1,
      limit: 12,
    });
    expect(result.content).toEqual([samplePost]);
  });

  it('forwards an explicit page and limit', async () => {
    apiGet.mockResolvedValue({ content: [], total: 0, page: 3, limit: 6, totalPages: 0 });

    await cmsPublicService.listBlogPosts(3, 6);

    expect(apiGet).toHaveBeenCalledWith('/api/v1/cms/public/content', {
      contentType: 'blog_post',
      page: 3,
      limit: 6,
    });
  });
});

describe('listHelpArticles', () => {
  it('requests help_article content with default pagination', async () => {
    apiGet.mockResolvedValue({ content: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    await cmsPublicService.listHelpArticles();

    expect(apiGet).toHaveBeenCalledWith('/api/v1/cms/public/content', {
      contentType: 'help_article',
      page: 1,
      limit: 20,
    });
  });
});

describe('single-content reads unwrap the content envelope', () => {
  it('getBlogPost returns the inner content for a slug', async () => {
    apiGet.mockResolvedValue({ content: samplePost });

    const result = await cmsPublicService.getBlogPost('adopting-a-senior-dog');

    expect(apiGet).toHaveBeenCalledWith('/api/v1/cms/public/content/adopting-a-senior-dog');
    expect(result).toEqual(samplePost);
  });

  it('getHelpArticle returns the inner content for a slug', async () => {
    apiGet.mockResolvedValue({ content: samplePost });

    const result = await cmsPublicService.getHelpArticle('how-to-apply');

    expect(apiGet).toHaveBeenCalledWith('/api/v1/cms/public/content/how-to-apply');
    expect(result).toEqual(samplePost);
  });

  it('getStaticPage returns the inner content for a slug', async () => {
    apiGet.mockResolvedValue({ content: samplePost });

    const result = await cmsPublicService.getStaticPage('about');

    expect(apiGet).toHaveBeenCalledWith('/api/v1/cms/public/content/about');
    expect(result).toEqual(samplePost);
  });

  it('propagates request errors to the caller', async () => {
    apiGet.mockRejectedValue(new Error('404'));

    await expect(cmsPublicService.getBlogPost('missing')).rejects.toThrow('404');
  });
});
