import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { cmsService } from './cmsService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('CmsService', () => {
  describe('listContent', () => {
    it('passes only defined filters to the content endpoint', async () => {
      const result = { content: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      mockGet.mockResolvedValueOnce(result);

      const response = await cmsService.listContent({
        contentType: 'blog_post',
        status: undefined,
        search: 'cats',
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/content', {
        contentType: 'blog_post',
        search: 'cats',
      });
      expect(response).toEqual(result);
    });

    it('defaults to no filters', async () => {
      mockGet.mockResolvedValueOnce({ content: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await cmsService.listContent();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/content', {});
    });
  });

  describe('getContent', () => {
    it('unwraps the content envelope', async () => {
      mockGet.mockResolvedValueOnce({ content: { contentId: 'c1', title: 'Hello' } });

      const result = await cmsService.getContent('c1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/content/c1');
      expect(result).toEqual({ contentId: 'c1', title: 'Hello' });
    });
  });

  describe('getContentBySlug', () => {
    it('fetches by slug and unwraps the envelope', async () => {
      mockGet.mockResolvedValueOnce({ content: { contentId: 'c1', slug: 'hello' } });

      const result = await cmsService.getContentBySlug('hello');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/content/slug/hello');
      expect(result).toEqual({ contentId: 'c1', slug: 'hello' });
    });
  });

  describe('createContent', () => {
    it('posts the new content and unwraps the response', async () => {
      mockPost.mockResolvedValueOnce({ content: { contentId: 'c2', title: 'New' } });

      const result = await cmsService.createContent({
        title: 'New',
        contentType: 'page',
        content: 'body',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/cms/content', {
        title: 'New',
        contentType: 'page',
        content: 'body',
      });
      expect(result).toEqual({ contentId: 'c2', title: 'New' });
    });
  });

  describe('updateContent', () => {
    it('puts the update and unwraps the response', async () => {
      mockPut.mockResolvedValueOnce({ content: { contentId: 'c1', title: 'Edited' } });

      const result = await cmsService.updateContent('c1', { title: 'Edited' });

      expect(mockPut).toHaveBeenCalledWith('/api/v1/cms/content/c1', { title: 'Edited' });
      expect(result).toEqual({ contentId: 'c1', title: 'Edited' });
    });
  });

  describe('publishContent', () => {
    it('posts to the publish endpoint', async () => {
      mockPost.mockResolvedValueOnce({ content: { contentId: 'c1', status: 'published' } });

      const result = await cmsService.publishContent('c1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/cms/content/c1/publish', {});
      expect(result).toEqual({ contentId: 'c1', status: 'published' });
    });
  });

  describe('unpublishContent', () => {
    it('posts to the unpublish endpoint', async () => {
      mockPost.mockResolvedValueOnce({ content: { contentId: 'c1', status: 'draft' } });

      const result = await cmsService.unpublishContent('c1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/cms/content/c1/unpublish', {});
      expect(result).toEqual({ contentId: 'c1', status: 'draft' });
    });
  });

  describe('archiveContent', () => {
    it('posts to the archive endpoint', async () => {
      mockPost.mockResolvedValueOnce({ content: { contentId: 'c1', status: 'archived' } });

      const result = await cmsService.archiveContent('c1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/cms/content/c1/archive', {});
      expect(result).toEqual({ contentId: 'c1', status: 'archived' });
    });
  });

  describe('deleteContent', () => {
    it('calls DELETE on the content endpoint', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await cmsService.deleteContent('c1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/cms/content/c1');
    });
  });

  describe('getVersionHistory', () => {
    it('unwraps the versions list', async () => {
      const versions = [{ version: 1, title: 'v1' }];
      mockGet.mockResolvedValueOnce({ versions });

      const result = await cmsService.getVersionHistory('c1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/content/c1/versions');
      expect(result).toEqual(versions);
    });
  });

  describe('restoreVersion', () => {
    it('posts to the restore endpoint for the given version', async () => {
      mockPost.mockResolvedValueOnce({ content: { contentId: 'c1', currentVersion: 5 } });

      const result = await cmsService.restoreVersion('c1', 3);

      expect(mockPost).toHaveBeenCalledWith('/api/v1/cms/content/c1/versions/3/restore', {});
      expect(result).toEqual({ contentId: 'c1', currentVersion: 5 });
    });
  });

  describe('generateSlug', () => {
    it('requests a slug for the given title', async () => {
      mockGet.mockResolvedValueOnce({ slug: 'my-title' });

      const result = await cmsService.generateSlug('My Title');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/slug', { title: 'My Title' });
      expect(result).toBe('my-title');
    });
  });

  describe('listMenus', () => {
    it('unwraps the menus list', async () => {
      const menus = [{ menuId: 'm1', name: 'Header' }];
      mockGet.mockResolvedValueOnce({ menus });

      const result = await cmsService.listMenus();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/menus');
      expect(result).toEqual(menus);
    });
  });

  describe('getMenu', () => {
    it('unwraps a single menu', async () => {
      mockGet.mockResolvedValueOnce({ menu: { menuId: 'm1', name: 'Header' } });

      const result = await cmsService.getMenu('m1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/cms/menus/m1');
      expect(result).toEqual({ menuId: 'm1', name: 'Header' });
    });
  });

  describe('createMenu', () => {
    it('posts a new menu and unwraps the response', async () => {
      mockPost.mockResolvedValueOnce({ menu: { menuId: 'm2', name: 'Footer' } });

      const result = await cmsService.createMenu({ name: 'Footer', location: 'footer' });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/cms/menus', {
        name: 'Footer',
        location: 'footer',
      });
      expect(result).toEqual({ menuId: 'm2', name: 'Footer' });
    });
  });

  describe('updateMenu', () => {
    it('puts the menu update and unwraps the response', async () => {
      mockPut.mockResolvedValueOnce({ menu: { menuId: 'm1', name: 'Renamed' } });

      const result = await cmsService.updateMenu('m1', { name: 'Renamed' });

      expect(mockPut).toHaveBeenCalledWith('/api/v1/cms/menus/m1', { name: 'Renamed' });
      expect(result).toEqual({ menuId: 'm1', name: 'Renamed' });
    });
  });

  describe('deleteMenu', () => {
    it('calls DELETE on the menu endpoint', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await cmsService.deleteMenu('m1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/cms/menus/m1');
    });
  });
});
