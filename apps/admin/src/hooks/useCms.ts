import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cmsService,
  type ContentListFilters,
  type CreateContentInput,
  type CreateMenuInput,
  type UpdateContentInput,
  type UpdateMenuInput,
} from '../services/cmsService';

export const useCmsContent = (filters: ContentListFilters) =>
  useQuery({
    queryKey: ['cms', 'content', filters],
    queryFn: async () => (await cmsService.listContent(filters)).content,
  });

// Menus load lazily: the query stays idle until the Navigation Menus tab opens.
export const useCmsMenus = (enabled: boolean) =>
  useQuery({
    queryKey: ['cms', 'menus'],
    queryFn: () => cmsService.listMenus(),
    enabled,
  });

export const useGenerateSlug = () =>
  useMutation({ mutationFn: (title: string) => cmsService.generateSlug(title) });

export const useContentMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cms', 'content'] });

  return {
    create: useMutation({
      mutationFn: (input: CreateContentInput) => cmsService.createContent(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ contentId, input }: { contentId: string; input: UpdateContentInput }) =>
        cmsService.updateContent(contentId, input),
      onSuccess: invalidate,
    }),
    publish: useMutation({
      mutationFn: (contentId: string) => cmsService.publishContent(contentId),
      onSuccess: invalidate,
    }),
    unpublish: useMutation({
      mutationFn: (contentId: string) => cmsService.unpublishContent(contentId),
      onSuccess: invalidate,
    }),
    archive: useMutation({
      mutationFn: (contentId: string) => cmsService.archiveContent(contentId),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (contentId: string) => cmsService.deleteContent(contentId),
      onSuccess: invalidate,
    }),
  };
};

export const useMenuMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cms', 'menus'] });

  return {
    create: useMutation({
      mutationFn: (input: CreateMenuInput) => cmsService.createMenu(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ menuId, input }: { menuId: string; input: UpdateMenuInput }) =>
        cmsService.updateMenu(menuId, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (menuId: string) => cmsService.deleteMenu(menuId),
      onSuccess: invalidate,
    }),
  };
};
