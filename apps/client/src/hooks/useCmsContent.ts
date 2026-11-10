import { useQuery } from '@tanstack/react-query';
import { cmsPublicService } from '@/services/cmsService';

export const useBlogPosts = () =>
  useQuery({
    queryKey: ['cms', 'blog-posts'],
    queryFn: () => cmsPublicService.listBlogPosts(),
  });

export const useBlogPost = (slug: string | undefined) =>
  useQuery({
    queryKey: ['cms', 'blog-posts', slug],
    queryFn: () => cmsPublicService.getBlogPost(slug ?? ''),
    enabled: !!slug,
    retry: false,
  });

export const useHelpArticles = () =>
  useQuery({
    queryKey: ['cms', 'help-articles'],
    queryFn: () => cmsPublicService.listHelpArticles(),
  });

export const useHelpArticle = (slug: string | undefined) =>
  useQuery({
    queryKey: ['cms', 'help-articles', slug],
    queryFn: () => cmsPublicService.getHelpArticle(slug ?? ''),
    enabled: !!slug,
    retry: false,
  });
