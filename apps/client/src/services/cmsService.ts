import { apiService as api } from '@adopt-dont-shop/lib.api';

export type PublicContent = {
  contentId: string;
  title: string;
  slug: string;
  contentType: 'blog_post' | 'help_article' | 'page';
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type ContentListResult = {
  content: PublicContent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Envelope the gateway returns for the paginated list endpoint:
 * `{ success, data: PublicContent[], pagination: {...} }`. Single-item reads
 * use a different `{ success, content }` envelope handled below.
 */
type ContentListResponse = {
  data: PublicContent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const toContentListResult = (response: ContentListResponse): ContentListResult => ({
  content: response.data,
  total: response.pagination.total,
  page: response.pagination.page,
  limit: response.pagination.limit,
  totalPages: response.pagination.totalPages,
});

class CmsPublicService {
  async listBlogPosts(page = 1, limit = 12): Promise<ContentListResult> {
    const response = await api.get<ContentListResponse>('/api/v1/cms/public/content', {
      contentType: 'blog_post',
      page,
      limit,
    });
    return toContentListResult(response);
  }

  async getBlogPost(slug: string): Promise<PublicContent> {
    const response = await api.get<{ content: PublicContent }>(
      `/api/v1/cms/public/content/${slug}`
    );
    return response.content;
  }

  async listHelpArticles(page = 1, limit = 20): Promise<ContentListResult> {
    const response = await api.get<ContentListResponse>('/api/v1/cms/public/content', {
      contentType: 'help_article',
      page,
      limit,
    });
    return toContentListResult(response);
  }

  async getHelpArticle(slug: string): Promise<PublicContent> {
    const response = await api.get<{ content: PublicContent }>(
      `/api/v1/cms/public/content/${slug}`
    );
    return response.content;
  }

  async getStaticPage(slug: string): Promise<PublicContent> {
    const response = await api.get<{ content: PublicContent }>(
      `/api/v1/cms/public/content/${slug}`
    );
    return response.content;
  }
}

export const cmsPublicService = new CmsPublicService();
