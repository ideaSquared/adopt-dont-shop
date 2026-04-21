import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import CmsService from '../services/cms.service';
import { ContentType, ContentStatus } from '../models/Content';
import { MenuLocation } from '../models/NavigationMenu';

// Content

export const listContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      contentType,
      status,
      search,
      page,
      limit,
      authorId,
    } = req.query as Record<string, string | undefined>;

    const result = await CmsService.listContent({
      contentType: contentType as ContentType | undefined,
      status: status as ContentStatus | undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      authorId,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    throw error;
  }
};

export const getContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const item = await CmsService.getContentById(req.params.contentId);
    res.json({ success: true, content: item });
  } catch (error) {
    throw error;
  }
};

export const getContentBySlug = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const item = await CmsService.getContentBySlug(req.params.slug);
    res.json({ success: true, content: item });
  } catch (error) {
    throw error;
  }
};

export const createContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const item = await CmsService.createContent({ ...req.body, authorId: userId });
    res.status(201).json({ success: true, message: 'Content created successfully', content: item });
  } catch (error) {
    throw error;
  }
};

export const updateContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const item = await CmsService.updateContent(req.params.contentId, {
      ...req.body,
      modifiedBy: userId,
    });
    res.json({ success: true, message: 'Content updated successfully', content: item });
  } catch (error) {
    throw error;
  }
};

export const publishContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const item = await CmsService.publishContent(req.params.contentId, userId);
    res.json({ success: true, message: 'Content published successfully', content: item });
  } catch (error) {
    throw error;
  }
};

export const unpublishContent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const item = await CmsService.unpublishContent(req.params.contentId, userId);
    res.json({ success: true, message: 'Content unpublished successfully', content: item });
  } catch (error) {
    throw error;
  }
};

export const archiveContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const item = await CmsService.archiveContent(req.params.contentId, userId);
    res.json({ success: true, message: 'Content archived successfully', content: item });
  } catch (error) {
    throw error;
  }
};

export const deleteContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await CmsService.deleteContent(req.params.contentId);
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    throw error;
  }
};

export const getVersionHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const versions = await CmsService.getContentVersionHistory(req.params.contentId);
    res.json({ success: true, versions });
  } catch (error) {
    throw error;
  }
};

export const restoreVersion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const version = parseInt(req.params.version, 10);
    const item = await CmsService.restoreContentVersion(req.params.contentId, version, userId);
    res.json({ success: true, message: `Restored to version ${version}`, content: item });
  } catch (error) {
    throw error;
  }
};

export const generateSlug = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title } = req.query as { title?: string };
    if (!title) {
      res.status(400).json({ success: false, error: 'title query parameter is required' });
      return;
    }
    const slug = CmsService.generateSlug(title);
    res.json({ success: true, slug });
  } catch (error) {
    throw error;
  }
};

// Navigation Menus

export const listMenus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const menus = await CmsService.listNavigationMenus();
    res.json({ success: true, menus });
  } catch (error) {
    throw error;
  }
};

export const getMenu = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const menu = await CmsService.getNavigationMenuById(req.params.menuId);
    res.json({ success: true, menu });
  } catch (error) {
    throw error;
  }
};

export const createMenu = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const menu = await CmsService.createNavigationMenu({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, message: 'Navigation menu created successfully', menu });
  } catch (error) {
    throw error;
  }
};

export const updateMenu = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const menu = await CmsService.updateNavigationMenu(req.params.menuId, {
      ...req.body,
      modifiedBy: userId,
    });
    res.json({ success: true, message: 'Navigation menu updated successfully', menu });
  } catch (error) {
    throw error;
  }
};

export const deleteMenu = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await CmsService.deleteNavigationMenu(req.params.menuId);
    res.json({ success: true, message: 'Navigation menu deleted successfully' });
  } catch (error) {
    throw error;
  }
};

// Type re-exports to avoid unused import warnings
export type { ContentType, ContentStatus, MenuLocation };
