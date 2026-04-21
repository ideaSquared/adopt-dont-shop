import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logDatabase: vi.fn(), logPerformance: vi.fn() },
}));

import User, { UserStatus, UserType } from '../../models/User';
import Content, { ContentType, ContentStatus } from '../../models/Content';
import NavigationMenu, { MenuLocation } from '../../models/NavigationMenu';
import CmsService from '../../services/cms.service';

const makeUser = () =>
  User.create({
    userId: 'author-1',
    firstName: 'Jane',
    lastName: 'Author',
    email: 'author@example.com',
    password: 'hashedPassword123!',
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    emailVerified: true,
  });

describe('CmsService – content management', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Content.destroy({ where: {}, truncate: true, cascade: true });
    await NavigationMenu.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('createContent', () => {
    it('creates a content item with draft status and initial version', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'Welcome Page', slug: 'welcome', contentType: ContentType.PAGE,
        content: '<h1>Welcome</h1>', authorId: 'author-1',
      });
      expect(item.title).toBe('Welcome Page');
      expect(item.slug).toBe('welcome');
      expect(item.status).toBe(ContentStatus.DRAFT);
      expect(item.currentVersion).toBe(1);
      expect(item.versions).toHaveLength(1);
      expect(item.versions[0].changedBy).toBe('author-1');
    });

    it('auto-generates slug from title when slug is omitted', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'About Our Mission', contentType: ContentType.PAGE,
        content: '<p>Our mission</p>', authorId: 'author-1',
      });
      expect(item.slug).toBe('about-our-mission');
    });

    it('rejects duplicate slugs', async () => {
      await makeUser();
      await CmsService.createContent({
        title: 'First', slug: 'unique-slug', contentType: ContentType.PAGE,
        content: '<p>First</p>', authorId: 'author-1',
      });
      await expect(
        CmsService.createContent({
          title: 'Second', slug: 'unique-slug', contentType: ContentType.PAGE,
          content: '<p>Second</p>', authorId: 'author-1',
        })
      ).rejects.toThrow(/slug already exists/i);
    });

    it('stores SEO fields on creation', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'SEO Test', slug: 'seo-test', contentType: ContentType.BLOG_POST,
        content: '<p>SEO content</p>', metaTitle: 'SEO Title',
        metaDescription: 'SEO description', metaKeywords: ['dogs', 'adoption'],
        authorId: 'author-1',
      });
      expect(item.metaTitle).toBe('SEO Title');
      expect(item.metaDescription).toBe('SEO description');
      expect(item.metaKeywords).toEqual(['dogs', 'adoption']);
    });
  });

  describe('updateContent', () => {
    it('creates a new version on each update', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'Original Title', slug: 'original', contentType: ContentType.PAGE,
        content: '<p>v1</p>', authorId: 'author-1',
      });
      const updated = await CmsService.updateContent(item.contentId, {
        title: 'Updated Title', content: '<p>v2</p>', changeNote: 'Fixed typo', modifiedBy: 'author-1',
      });
      expect(updated.currentVersion).toBe(2);
      expect(updated.versions).toHaveLength(2);
      expect(updated.title).toBe('Updated Title');
      expect(updated.versions[1].changeNote).toBe('Fixed typo');
    });

    it('throws 404 for non-existent content', async () => {
      await expect(
        CmsService.updateContent('nonexistent-id', { title: 'New', modifiedBy: 'user-1' })
      ).rejects.toThrow('Content not found');
    });
  });

  describe('publish / unpublish workflow', () => {
    it('publishes a draft and sets publishedAt', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'Draft Post', slug: 'draft-post', contentType: ContentType.BLOG_POST,
        content: '<p>draft</p>', authorId: 'author-1',
      });
      const published = await CmsService.publishContent(item.contentId, 'author-1');
      expect(published.status).toBe(ContentStatus.PUBLISHED);
      expect(published.publishedAt).toBeInstanceOf(Date);
    });

    it('rejects publishing already-published content', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'Published Post', slug: 'pub-post', contentType: ContentType.BLOG_POST,
        content: '<p>pub</p>', authorId: 'author-1',
      });
      await CmsService.publishContent(item.contentId, 'author-1');
      await expect(CmsService.publishContent(item.contentId, 'author-1')).rejects.toThrow(/already published/i);
    });

    it('unpublishes published content back to draft', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'Live Post', slug: 'live-post', contentType: ContentType.BLOG_POST,
        content: '<p>live</p>', authorId: 'author-1',
      });
      await CmsService.publishContent(item.contentId, 'author-1');
      const unpublished = await CmsService.unpublishContent(item.contentId, 'author-1');
      expect(unpublished.status).toBe(ContentStatus.DRAFT);
    });
  });

  describe('version history and restore', () => {
    it('returns full version history', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'V1', slug: 'version-history', contentType: ContentType.PAGE,
        content: '<p>v1</p>', authorId: 'author-1',
      });
      await CmsService.updateContent(item.contentId, { title: 'V2', content: '<p>v2</p>', modifiedBy: 'author-1' });
      const versions = await CmsService.getContentVersionHistory(item.contentId);
      expect(versions).toHaveLength(2);
    });

    it('restores a previous version as a new version', async () => {
      await makeUser();
      const item = await CmsService.createContent({
        title: 'Orig', slug: 'restore-test', contentType: ContentType.PAGE,
        content: '<p>original</p>', authorId: 'author-1',
      });
      await CmsService.updateContent(item.contentId, { title: 'Changed', content: '<p>changed</p>', modifiedBy: 'author-1' });
      const restored = await CmsService.restoreContentVersion(item.contentId, 1, 'author-1');
      expect(restored.currentVersion).toBe(3);
      expect(restored.title).toBe('Orig');
    });
  });

  describe('listContent', () => {
    it('returns all content without filters', async () => {
      await makeUser();
      await CmsService.createContent({ title: 'Page 1', slug: 'page-1', contentType: ContentType.PAGE, content: '<p>p1</p>', authorId: 'author-1' });
      await CmsService.createContent({ title: 'Blog Post 1', slug: 'blog-1', contentType: ContentType.BLOG_POST, content: '<p>b1</p>', authorId: 'author-1' });
      const result = await CmsService.listContent();
      expect(result.content).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by contentType', async () => {
      await makeUser();
      await CmsService.createContent({ title: 'Page', slug: 'a-page', contentType: ContentType.PAGE, content: '<p>page</p>', authorId: 'author-1' });
      await CmsService.createContent({ title: 'Help', slug: 'a-help', contentType: ContentType.HELP_ARTICLE, content: '<p>help</p>', authorId: 'author-1' });
      const result = await CmsService.listContent({ contentType: ContentType.PAGE });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].contentType).toBe(ContentType.PAGE);
    });

    it('filters by status', async () => {
      await makeUser();
      const item = await CmsService.createContent({ title: 'To Publish', slug: 'to-publish', contentType: ContentType.PAGE, content: '<p>pub</p>', authorId: 'author-1' });
      await CmsService.publishContent(item.contentId, 'author-1');
      await CmsService.createContent({ title: 'Still Draft', slug: 'still-draft', contentType: ContentType.PAGE, content: '<p>draft</p>', authorId: 'author-1' });
      const published = await CmsService.listContent({ status: ContentStatus.PUBLISHED });
      expect(published.content).toHaveLength(1);
      expect(published.content[0].status).toBe(ContentStatus.PUBLISHED);
    });
  });

  describe('deleteContent', () => {
    it('soft-deletes content', async () => {
      await makeUser();
      const item = await CmsService.createContent({ title: 'To Delete', slug: 'to-delete', contentType: ContentType.PAGE, content: '<p>bye</p>', authorId: 'author-1' });
      await CmsService.deleteContent(item.contentId);
      const result = await CmsService.listContent();
      expect(result.content).toHaveLength(0);
    });
  });
});

describe('CmsService – navigation menus', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await NavigationMenu.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('creates a navigation menu', async () => {
    await makeUser();
    const menu = await CmsService.createNavigationMenu({ name: 'Main Nav', location: MenuLocation.HEADER, createdBy: 'author-1' });
    expect(menu.name).toBe('Main Nav');
    expect(menu.location).toBe(MenuLocation.HEADER);
    expect(menu.isActive).toBe(true);
    expect(menu.items).toEqual([]);
  });

  it('updates a navigation menu with new items', async () => {
    await makeUser();
    const menu = await CmsService.createNavigationMenu({ name: 'Footer', location: MenuLocation.FOOTER, createdBy: 'author-1' });
    const items = [
      { id: '1', label: 'Home', url: '/', openInNewTab: false, order: 1 },
      { id: '2', label: 'About', url: '/about', openInNewTab: false, order: 2 },
    ];
    const updated = await CmsService.updateNavigationMenu(menu.menuId, { items, modifiedBy: 'author-1' });
    expect(updated.items).toHaveLength(2);
    expect(updated.lastModifiedBy).toBe('author-1');
  });

  it('deletes a navigation menu', async () => {
    await makeUser();
    const menu = await CmsService.createNavigationMenu({ name: 'Temp Menu', location: MenuLocation.SIDEBAR, createdBy: 'author-1' });
    await CmsService.deleteNavigationMenu(menu.menuId);
    const all = await CmsService.listNavigationMenus();
    expect(all).toHaveLength(0);
  });

  it('throws 404 for non-existent menu', async () => {
    await expect(CmsService.getNavigationMenuById('nonexistent-id')).rejects.toThrow('Navigation menu not found');
  });

  it('generates a slug from a title', () => {
    expect(CmsService.generateSlug('Hello World!')).toBe('hello-world');
    expect(CmsService.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    expect(CmsService.generateSlug('Cats & Dogs')).toBe('cats-dogs');
  });
});
