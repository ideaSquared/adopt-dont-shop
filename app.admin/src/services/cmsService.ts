import { apiService } from './libraryServices';

export type ContentType = 'page' | 'blog_post' | 'help_article';
export type ContentStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type MenuLocation = 'header' | 'footer' | 'sidebar';

export type ContentVersion = {
  version: number;
  title: string;
  content: string;
  excerpt: string | undefined;
  changedBy: string;
  changeNote: string | undefined;
  createdAt: string;
};

export type Content = {
  contentId: string;
  title: string;
  slug: string;
  contentType: ContentType;
  status: ContentStatus;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImageUrl?: string;
  publishedAt?: string;
  scheduledPublishAt?: string;
  scheduledUnpublishAt?: string;
  versions: ContentVersion[];
  currentVersion: number;
  authorId: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  order: number;
  children?: NavigationItem[];
};

export type NavigationMenu = {
  menuId: string;
  name: string;
  location: MenuLocation;
  items: NavigationItem[];
  isActive: boolean;
  createdBy: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentListFilters = {
  contentType?: ContentType;
  status?: ContentStatus;
  search?: string;
  page?: number;
  limit?: number;
  authorId?: string;
};

export type ContentListResult = {
  content: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateContentInput = {
  title: string;
  slug?: string;
  contentType: ContentType;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImageUrl?: string;
  scheduledPublishAt?: string;
  scheduledUnpublishAt?: string;
};

export type UpdateContentInput = {
  title?: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImageUrl?: string;
  scheduledPublishAt?: string;
  scheduledUnpublishAt?: string;
  changeNote?: string;
};

export type CreateMenuInput = {
  name: string;
  location: MenuLocation;
  items?: NavigationItem[];
  isActive?: boolean;
};

export type UpdateMenuInput = {
  name?: string;
  location?: MenuLocation;
  items?: NavigationItem[];
  isActive?: boolean;
};

class CmsService {
  async listContent(filters: ContentListFilters = {}): Promise<ContentListResult> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined)
    ) as Record<string, string | number>;

    return apiService.get<ContentListResult>('/api/v1/cms/content', params);
  }

  async getContent(contentId: string): Promise<Content> {
    const response = await apiService.get<{ content: Content }>(
      `/api/v1/cms/content/${contentId}`
    );
    return response.content;
  }

  async getContentBySlug(slug: string): Promise<Content> {
    const response = await apiService.get<{ content: Content }>(
      `/api/v1/cms/content/slug/${slug}`
    );
    return response.content;
  }

  async createContent(input: CreateContentInput): Promise<Content> {
    const response = await apiService.post<{ content: Content }>(
      '/api/v1/cms/content',
      input
    );
    return response.content;
  }

  async updateContent(contentId: string, input: UpdateContentInput): Promise<Content> {
    const response = await apiService.put<{ content: Content }>(
      `/api/v1/cms/content/${contentId}`,
      input
    );
    return response.content;
  }

  async publishContent(contentId: string): Promise<Content> {
    const response = await apiService.post<{ content: Content }>(
      `/api/v1/cms/content/${contentId}/publish`,
      {}
    );
    return response.content;
  }

  async unpublishContent(contentId: string): Promise<Content> {
    const response = await apiService.post<{ content: Content }>(
      `/api/v1/cms/content/${contentId}/unpublish`,
      {}
    );
    return response.content;
  }

  async archiveContent(contentId: string): Promise<Content> {
    const response = await apiService.post<{ content: Content }>(
      `/api/v1/cms/content/${contentId}/archive`,
      {}
    );
    return response.content;
  }

  async deleteContent(contentId: string): Promise<void> {
    await apiService.delete(`/api/v1/cms/content/${contentId}`);
  }

  async getVersionHistory(contentId: string): Promise<ContentVersion[]> {
    const response = await apiService.get<{ versions: ContentVersion[] }>(
      `/api/v1/cms/content/${contentId}/versions`
    );
    return response.versions;
  }

  async restoreVersion(contentId: string, version: number): Promise<Content> {
    const response = await apiService.post<{ content: Content }>(
      `/api/v1/cms/content/${contentId}/versions/${version}/restore`,
      {}
    );
    return response.content;
  }

  async generateSlug(title: string): Promise<string> {
    const response = await apiService.get<{ slug: string }>('/api/v1/cms/slug', { title });
    return response.slug;
  }

  async listMenus(): Promise<NavigationMenu[]> {
    const response = await apiService.get<{ menus: NavigationMenu[] }>('/api/v1/cms/menus');
    return response.menus;
  }

  async getMenu(menuId: string): Promise<NavigationMenu> {
    const response = await apiService.get<{ menu: NavigationMenu }>(
      `/api/v1/cms/menus/${menuId}`
    );
    return response.menu;
  }

  async createMenu(input: CreateMenuInput): Promise<NavigationMenu> {
    const response = await apiService.post<{ menu: NavigationMenu }>('/api/v1/cms/menus', input);
    return response.menu;
  }

  async updateMenu(menuId: string, input: UpdateMenuInput): Promise<NavigationMenu> {
    const response = await apiService.put<{ menu: NavigationMenu }>(
      `/api/v1/cms/menus/${menuId}`,
      input
    );
    return response.menu;
  }

  async deleteMenu(menuId: string): Promise<void> {
    await apiService.delete(`/api/v1/cms/menus/${menuId}`);
  }
}

export const cmsService = new CmsService();
