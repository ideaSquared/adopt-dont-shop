import { Op, WhereOptions } from 'sequelize';
import Content, { ContentStatus, ContentType } from '../models/Content';
import NavigationMenu, { MenuLocation } from '../models/NavigationMenu';
import sequelize from '../sequelize';
import { logger } from '../utils/logger';
import { RichTextProcessingService } from './rich-text-processing.service';

type ListContentOptions = {
  contentType?: ContentType;
  status?: ContentStatus;
  search?: string;
  page?: number;
  limit?: number;
  authorId?: string;
};

type ListContentResult = {
  content: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type CreateContentInput = {
  title: string;
  slug?: string;
  contentType: ContentType;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImageUrl?: string;
  scheduledPublishAt?: Date;
  scheduledUnpublishAt?: Date;
  authorId: string;
};

type UpdateContentInput = {
  title?: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImageUrl?: string;
  scheduledPublishAt?: Date;
  scheduledUnpublishAt?: Date;
  changeNote?: string;
  modifiedBy: string;
};

// createdBy / modifiedBy removed — the audit-columns hook stamps
// created_by / updated_by from the request context.
type NavigationMenuInput = {
  name: string;
  location: MenuLocation;
  items?: NavigationMenu['items'];
  isActive?: boolean;
};

type UpdateNavigationMenuInput = {
  name?: string;
  location?: MenuLocation;
  items?: NavigationMenu['items'];
  isActive?: boolean;
};

const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

class CmsService {
  async listContent(options: ListContentOptions = {}): Promise<ListContentResult> {
    const { contentType, status, search, page = 1, limit = 20, authorId } = options;

    const where: WhereOptions = {};

    if (contentType) {
      Object.assign(where, { contentType });
    }
    if (status) {
      Object.assign(where, { status });
    }
    if (authorId) {
      Object.assign(where, { authorId });
    }
    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      Object.assign(where, {
        [Op.or]: [
          { title: { [likeOp]: `%${search}%` } },
          { excerpt: { [likeOp]: `%${search}%` } },
          { slug: { [likeOp]: `%${search}%` } },
        ],
      });
    }

    const offset = (page - 1) * limit;
    const { rows, count } = await Content.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      content: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getContentById(contentId: string): Promise<Content> {
    const item = await Content.findByPk(contentId);
    if (!item) {
      const error = new Error('Content not found');
      (error as Error & { statusCode: number }).statusCode = 404;
      throw error;
    }
    return item;
  }

  async getContentBySlug(slug: string): Promise<Content> {
    const item = await Content.findOne({ where: { slug } });
    if (!item) {
      const error = new Error('Content not found');
      (error as Error & { statusCode: number }).statusCode = 404;
      throw error;
    }
    return item;
  }

  async createContent(input: CreateContentInput): Promise<Content> {
    const slug = input.slug || generateSlug(input.title);

    const existing = await Content.findOne({ where: { slug } });
    if (existing) {
      const error = new Error('A content item with this slug already exists');
      (error as Error & { statusCode: number }).statusCode = 409;
      throw error;
    }

    const sanitizedContent = RichTextProcessingService.sanitize(input.content);

    const initialVersion = {
      version: 1,
      title: input.title,
      content: sanitizedContent,
      excerpt: input.excerpt,
      changedBy: input.authorId,
      changeNote: 'Initial version',
      createdAt: new Date(),
    };

    const item = await Content.create({
      title: input.title,
      slug,
      contentType: input.contentType,
      status: ContentStatus.DRAFT,
      content: sanitizedContent,
      excerpt: input.excerpt,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      metaKeywords: input.metaKeywords ?? [],
      featuredImageUrl: input.featuredImageUrl,
      scheduledPublishAt: input.scheduledPublishAt,
      scheduledUnpublishAt: input.scheduledUnpublishAt,
      versions: [initialVersion],
      currentVersion: 1,
      authorId: input.authorId,
    });

    logger.info('CMS content created', { contentId: item.contentId, slug });
    return item;
  }

  async updateContent(contentId: string, input: UpdateContentInput): Promise<Content> {
    const item = await this.getContentById(contentId);

    const updatedTitle = input.title ?? item.title;
    const updatedContent =
      input.content !== undefined
        ? RichTextProcessingService.sanitize(input.content)
        : item.content;
    const updatedExcerpt = input.excerpt !== undefined ? input.excerpt : item.excerpt;

    item.addVersion(
      updatedTitle,
      updatedContent,
      updatedExcerpt,
      input.modifiedBy,
      input.changeNote
    );

    if (input.metaTitle !== undefined) {
      item.metaTitle = input.metaTitle;
    }
    if (input.metaDescription !== undefined) {
      item.metaDescription = input.metaDescription;
    }
    if (input.metaKeywords !== undefined) {
      item.metaKeywords = input.metaKeywords;
    }
    if (input.featuredImageUrl !== undefined) {
      item.featuredImageUrl = input.featuredImageUrl;
    }
    if (input.scheduledPublishAt !== undefined) {
      item.scheduledPublishAt = input.scheduledPublishAt;
    }
    if (input.scheduledUnpublishAt !== undefined) {
      item.scheduledUnpublishAt = input.scheduledUnpublishAt;
    }

    await item.save();
    logger.info('CMS content updated', { contentId, version: item.currentVersion });
    return item;
  }

  async publishContent(contentId: string, modifiedBy: string): Promise<Content> {
    const item = await this.getContentById(contentId);

    if (item.status === ContentStatus.PUBLISHED) {
      const error = new Error('Content is already published');
      (error as Error & { statusCode: number }).statusCode = 409;
      throw error;
    }

    item.status = ContentStatus.PUBLISHED;
    item.publishedAt = new Date();
    item.lastModifiedBy = modifiedBy;
    await item.save();

    logger.info('CMS content published', { contentId });
    return item;
  }

  async unpublishContent(contentId: string, modifiedBy: string): Promise<Content> {
    const item = await this.getContentById(contentId);

    if (item.status !== ContentStatus.PUBLISHED) {
      const error = new Error('Content is not published');
      (error as Error & { statusCode: number }).statusCode = 409;
      throw error;
    }

    item.status = ContentStatus.DRAFT;
    item.lastModifiedBy = modifiedBy;
    await item.save();

    logger.info('CMS content unpublished', { contentId });
    return item;
  }

  async archiveContent(contentId: string, modifiedBy: string): Promise<Content> {
    const item = await this.getContentById(contentId);
    item.status = ContentStatus.ARCHIVED;
    item.lastModifiedBy = modifiedBy;
    await item.save();
    logger.info('CMS content archived', { contentId });
    return item;
  }

  async deleteContent(contentId: string): Promise<void> {
    const item = await this.getContentById(contentId);
    await item.destroy();
    logger.info('CMS content deleted', { contentId });
  }

  async getContentVersionHistory(contentId: string): Promise<Content['versions']> {
    const item = await this.getContentById(contentId);
    return item.versions;
  }

  async restoreContentVersion(
    contentId: string,
    version: number,
    modifiedBy: string
  ): Promise<Content> {
    const item = await this.getContentById(contentId);
    const targetVersion = item.getVersion(version);

    if (!targetVersion) {
      const error = new Error(`Version ${version} not found`);
      (error as Error & { statusCode: number }).statusCode = 404;
      throw error;
    }

    item.addVersion(
      targetVersion.title,
      targetVersion.content,
      targetVersion.excerpt,
      modifiedBy,
      `Restored from version ${version}`
    );
    await item.save();

    logger.info('CMS content version restored', { contentId, restoredVersion: version });
    return item;
  }

  async processScheduledContent(): Promise<void> {
    const now = new Date();

    const toPublish = await Content.findAll({
      where: {
        status: ContentStatus.SCHEDULED,
        scheduledPublishAt: { [Op.lte]: now },
      },
    });

    for (const item of toPublish) {
      item.status = ContentStatus.PUBLISHED;
      item.publishedAt = now;
      await item.save();
      logger.info('Scheduled content auto-published', { contentId: item.contentId });
    }

    const toUnpublish = await Content.findAll({
      where: {
        status: ContentStatus.PUBLISHED,
        scheduledUnpublishAt: { [Op.lte]: now },
      },
    });

    for (const item of toUnpublish) {
      item.status = ContentStatus.ARCHIVED;
      await item.save();
      logger.info('Scheduled content auto-unpublished', { contentId: item.contentId });
    }
  }

  // Navigation Menu

  async listNavigationMenus(): Promise<NavigationMenu[]> {
    return NavigationMenu.findAll({
      order: [
        ['location', 'ASC'],
        ['name', 'ASC'],
      ],
    });
  }

  async getNavigationMenuById(menuId: string): Promise<NavigationMenu> {
    const menu = await NavigationMenu.findByPk(menuId);
    if (!menu) {
      const error = new Error('Navigation menu not found');
      (error as Error & { statusCode: number }).statusCode = 404;
      throw error;
    }
    return menu;
  }

  async createNavigationMenu(input: NavigationMenuInput): Promise<NavigationMenu> {
    const menu = await NavigationMenu.create({
      name: input.name,
      location: input.location,
      items: input.items ?? [],
      isActive: input.isActive ?? true,
      // created_by stamped by the audit hook from request context.
    });
    logger.info('Navigation menu created', { menuId: menu.menuId });
    return menu;
  }

  async updateNavigationMenu(
    menuId: string,
    input: UpdateNavigationMenuInput
  ): Promise<NavigationMenu> {
    const menu = await this.getNavigationMenuById(menuId);

    if (input.name !== undefined) {
      menu.name = input.name;
    }
    if (input.location !== undefined) {
      menu.location = input.location;
    }
    if (input.items !== undefined) {
      menu.items = input.items;
    }
    if (input.isActive !== undefined) {
      menu.isActive = input.isActive;
    }
    // updated_by stamped by the audit hook on save from request context.

    await menu.save();
    logger.info('Navigation menu updated', { menuId });
    return menu;
  }

  async deleteNavigationMenu(menuId: string): Promise<void> {
    const menu = await this.getNavigationMenuById(menuId);
    await menu.destroy();
    logger.info('Navigation menu deleted', { menuId });
  }

  generateSlug(title: string): string {
    return generateSlug(title);
  }
}

export default new CmsService();
