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

class CmsPublicService {
  async listBlogPosts(page = 1, limit = 12): Promise<ContentListResult> {
    return api.get<ContentListResult>('/api/v1/cms/public/content', {
      contentType: 'blog_post',
      page,
      limit,
    });
  }

  async getBlogPost(slug: string): Promise<PublicContent> {
    const response = await api.get<{ content: PublicContent }>(
      `/api/v1/cms/public/content/${slug}`
    );
    return response.content;
  }

  async listHelpArticles(page = 1, limit = 20): Promise<ContentListResult> {
    return api.get<ContentListResult>('/api/v1/cms/public/content', {
      contentType: 'help_article',
      page,
      limit,
    });
  }

  async getHelpArticle(slug: string): Promise<PublicContent> {
    const response = await api.get<{ content: PublicContent }>(
      `/api/v1/cms/public/content/${slug}`
    );
    return response.content;
  }
}

export const cmsPublicService = new CmsPublicService();
