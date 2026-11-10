import React, { useState } from 'react';
import { Archive, Eye, EyeOff, Menu, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  ErrorState,
  FormField,
  FormRow,
  FormSection,
  Input,
  Modal,
  PageHeader,
  SearchToolbar,
  SelectInput,
  Stack,
  Tabs,
  TextArea,
  toast,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import {
  useCmsContent,
  useCmsMenus,
  useContentMutations,
  useGenerateSlug,
  useMenuMutations,
} from '../hooks/useCms';
import type {
  Content,
  ContentType,
  ContentStatus,
  NavigationMenu,
  CreateContentInput,
  UpdateContentInput,
  CreateMenuInput,
} from '../services/cmsService';
import * as styles from './ContentManagement.css';

type ActiveTab = 'content' | 'menus';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  page: 'Page',
  blog_post: 'Blog Post',
  help_article: 'Help Article',
};

const CONTENT_TYPES: ReadonlyArray<ContentType> = ['page', 'blog_post', 'help_article'];
const CONTENT_STATUSES: ReadonlyArray<ContentStatus> = [
  'draft',
  'published',
  'scheduled',
  'archived',
];
const MENU_LOCATIONS: ReadonlyArray<MenuFormState['location']> = ['header', 'footer', 'sidebar'];

const CONTENT_TYPE_OPTIONS = CONTENT_TYPES.map(value => ({
  value,
  label: CONTENT_TYPE_LABELS[value],
}));

const MENU_LOCATION_OPTIONS = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'sidebar', label: 'Sidebar' },
];

const MENU_ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

type ContentFormState = {
  title: string;
  slug: string;
  contentType: ContentType;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  featuredImageUrl: string;
  scheduledPublishAt: string;
  scheduledUnpublishAt: string;
  changeNote: string;
};

const emptyContentForm = (): ContentFormState => ({
  title: '',
  slug: '',
  contentType: 'page',
  content: '',
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  featuredImageUrl: '',
  scheduledPublishAt: '',
  scheduledUnpublishAt: '',
  changeNote: '',
});

type MenuFormState = {
  name: string;
  location: 'header' | 'footer' | 'sidebar';
  isActive: boolean;
};

const emptyMenuForm = (): MenuFormState => ({ name: '', location: 'header', isActive: true });

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

const getStatusVariant = (status: string): BadgeVariant => {
  if (status === 'published') {
    return 'success';
  }
  if (status === 'draft') {
    return 'warning';
  }
  if (status === 'scheduled') {
    return 'info';
  }
  return 'neutral';
};

const singleValue = (value: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : value;

const ContentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('content');
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentForm, setContentForm] = useState<ContentFormState>(emptyContentForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<NavigationMenu | null>(null);
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm());
  const { confirm, confirmProps } = useConfirm();

  const contentQuery = useCmsContent({
    contentType: contentTypeFilter || undefined,
    status: statusFilter || undefined,
    search: contentSearch || undefined,
  });
  const menusQuery = useCmsMenus(activeTab === 'menus');
  const contentMutations = useContentMutations();
  const menuMutations = useMenuMutations();
  const generateSlug = useGenerateSlug();

  const contentList = contentQuery.data ?? [];
  const menus = menusQuery.data ?? [];
  const saving =
    contentMutations.create.isPending ||
    contentMutations.update.isPending ||
    menuMutations.create.isPending ||
    menuMutations.update.isPending;

  const handleFilterChange = (name: string, value: string | boolean) => {
    const next = String(value);
    if (name === 'contentType') {
      setContentTypeFilter(CONTENT_TYPES.find(type => type === next) ?? '');
      return;
    }
    setStatusFilter(CONTENT_STATUSES.find(status => status === next) ?? '');
  };

  const openCreateContent = () => {
    setEditingContent(null);
    setContentForm(emptyContentForm());
    setFormError(null);
    setShowContentModal(true);
  };

  const openEditContent = (item: Content) => {
    setEditingContent(item);
    setContentForm({
      title: item.title,
      slug: item.slug,
      contentType: item.contentType,
      content: item.content,
      excerpt: item.excerpt ?? '',
      metaTitle: item.metaTitle ?? '',
      metaDescription: item.metaDescription ?? '',
      metaKeywords: (item.metaKeywords ?? []).join(', '),
      featuredImageUrl: item.featuredImageUrl ?? '',
      scheduledPublishAt: item.scheduledPublishAt ? item.scheduledPublishAt.slice(0, 16) : '',
      scheduledUnpublishAt: item.scheduledUnpublishAt ? item.scheduledUnpublishAt.slice(0, 16) : '',
      changeNote: '',
    });
    setFormError(null);
    setShowContentModal(true);
  };

  const handleSlugGenerate = async () => {
    if (!contentForm.title) {
      return;
    }
    try {
      const slug = await generateSlug.mutateAsync(contentForm.title);
      setContentForm(f => ({ ...f, slug }));
    } catch {
      // ignore
    }
  };

  const handleSaveContent = async () => {
    if (!contentForm.title.trim() || !contentForm.content.trim()) {
      setFormError('Title and content are required');
      return;
    }
    setFormError(null);
    try {
      const keywords = contentForm.metaKeywords
        ? contentForm.metaKeywords
            .split(',')
            .map(k => k.trim())
            .filter(Boolean)
        : [];

      if (editingContent) {
        const input: UpdateContentInput = {
          title: contentForm.title,
          content: contentForm.content,
          excerpt: contentForm.excerpt || undefined,
          metaTitle: contentForm.metaTitle || undefined,
          metaDescription: contentForm.metaDescription || undefined,
          metaKeywords: keywords,
          featuredImageUrl: contentForm.featuredImageUrl || undefined,
          scheduledPublishAt: contentForm.scheduledPublishAt || undefined,
          scheduledUnpublishAt: contentForm.scheduledUnpublishAt || undefined,
          changeNote: contentForm.changeNote || undefined,
        };
        await contentMutations.update.mutateAsync({
          contentId: editingContent.contentId,
          input,
        });
      } else {
        const input: CreateContentInput = {
          title: contentForm.title,
          slug: contentForm.slug || undefined,
          contentType: contentForm.contentType,
          content: contentForm.content,
          excerpt: contentForm.excerpt || undefined,
          metaTitle: contentForm.metaTitle || undefined,
          metaDescription: contentForm.metaDescription || undefined,
          metaKeywords: keywords,
          featuredImageUrl: contentForm.featuredImageUrl || undefined,
          scheduledPublishAt: contentForm.scheduledPublishAt || undefined,
          scheduledUnpublishAt: contentForm.scheduledUnpublishAt || undefined,
        };
        await contentMutations.create.mutateAsync(input);
      }
      toast.success(editingContent ? 'Content updated' : 'Content created');
      setShowContentModal(false);
    } catch (err) {
      setFormError((err as Error).message ?? 'Failed to save content');
    }
  };

  const handlePublish = async (item: Content) => {
    try {
      await contentMutations.publish.mutateAsync(item.contentId);
      toast.success('Content published');
    } catch {
      toast.error('Failed to publish content');
    }
  };

  const handleUnpublish = async (item: Content) => {
    try {
      await contentMutations.unpublish.mutateAsync(item.contentId);
      toast.success('Content unpublished');
    } catch {
      toast.error('Failed to unpublish content');
    }
  };

  const handleArchive = async (item: Content) => {
    const confirmed = await confirm({
      title: 'Archive content?',
      message: `Archive "${item.title}"? This hides it from the site but keeps it for restoration.`,
      confirmText: 'Archive',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }
    try {
      await contentMutations.archive.mutateAsync(item.contentId);
      toast.success('Content archived');
    } catch {
      toast.error('Failed to archive content');
    }
  };

  const handleDeleteContent = async (item: Content) => {
    const confirmed = await confirm({
      title: 'Delete content?',
      message: `Permanently delete "${item.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await contentMutations.remove.mutateAsync(item.contentId);
      toast.success('Content deleted');
    } catch {
      toast.error('Failed to delete content');
    }
  };

  const openCreateMenu = () => {
    setEditingMenu(null);
    setMenuForm(emptyMenuForm());
    setShowMenuModal(true);
  };

  const openEditMenu = (menu: NavigationMenu) => {
    setEditingMenu(menu);
    setMenuForm({ name: menu.name, location: menu.location, isActive: menu.isActive });
    setShowMenuModal(true);
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name.trim()) {
      return;
    }
    try {
      if (editingMenu) {
        await menuMutations.update.mutateAsync({ menuId: editingMenu.menuId, input: menuForm });
      } else {
        const input: CreateMenuInput = {
          name: menuForm.name,
          location: menuForm.location,
          isActive: menuForm.isActive,
          items: [],
        };
        await menuMutations.create.mutateAsync(input);
      }
      toast.success(editingMenu ? 'Menu updated' : 'Menu created');
      setShowMenuModal(false);
    } catch {
      toast.error('Failed to save menu');
    }
  };

  const handleDeleteMenu = async (menu: NavigationMenu) => {
    const confirmed = await confirm({
      title: 'Delete menu?',
      message: `Delete menu "${menu.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await menuMutations.remove.mutateAsync(menu.menuId);
      toast.success('Menu deleted');
    } catch {
      toast.error('Failed to delete menu');
    }
  };

  const contentColumns: DataTableColumn[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: false,
      render: (_value, row) => <strong>{String(row.title)}</strong>,
    },
    {
      key: 'slug',
      label: 'Slug',
      sortable: false,
      render: (_value, row) => <span className={styles.slugCell}>/{String(row.slug)}</span>,
    },
    {
      key: 'contentType',
      label: 'Type',
      sortable: false,
      render: (_value, row) => {
        const type = CONTENT_TYPES.find(t => t === row.contentType);
        return type ? CONTENT_TYPE_LABELS[type] : String(row.contentType);
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (_value, row) => (
        <Badge variant={getStatusVariant(String(row.status))}>{String(row.status)}</Badge>
      ),
    },
    {
      key: 'currentVersion',
      label: 'Version',
      sortable: false,
      render: (_value, row) => `v${String(row.currentVersion)}`,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: false,
      render: (_value, row) => formatDisplayDate(String(row.updatedAt)),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) => {
        const item = contentList.find(c => c.contentId === row.contentId);
        if (!item) {
          return null;
        }
        return (
          <div className={styles.actionGroup}>
            <Button
              variant='ghost'
              size='sm'
              title='Edit'
              aria-label='Edit'
              onClick={() => openEditContent(item)}
            >
              <Pencil size='1em' aria-hidden />
            </Button>
            {item.status !== 'published' && (
              <Button
                variant='ghost'
                size='sm'
                title='Publish'
                aria-label='Publish'
                onClick={() => handlePublish(item)}
              >
                <Eye size='1em' aria-hidden />
              </Button>
            )}
            {item.status === 'published' && (
              <Button
                variant='ghost'
                size='sm'
                title='Unpublish'
                aria-label='Unpublish'
                onClick={() => handleUnpublish(item)}
              >
                <EyeOff size='1em' aria-hidden />
              </Button>
            )}
            {item.status !== 'archived' && (
              <Button
                variant='ghost'
                size='sm'
                title='Archive'
                aria-label='Archive'
                onClick={() => handleArchive(item)}
              >
                <Archive size='1em' aria-hidden />
              </Button>
            )}
            <Button
              variant='ghost'
              size='sm'
              title='Delete'
              aria-label='Delete'
              onClick={() => handleDeleteContent(item)}
            >
              <Trash2 size='1em' aria-hidden />
            </Button>
          </div>
        );
      },
    },
  ];

  const menuColumns: DataTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: false,
      render: (_value, row) => <strong>{String(row.name)}</strong>,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: false,
      render: (_value, row) => <span className={styles.capitalize}>{String(row.location)}</span>,
    },
    {
      key: 'items',
      label: 'Items',
      sortable: false,
      render: (_value, row) => `${Array.isArray(row.items) ? row.items.length : 0} items`,
    },
    {
      key: 'isActive',
      label: 'Active',
      sortable: false,
      render: (_value, row) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: false,
      render: (_value, row) => formatDisplayDate(String(row.updatedAt)),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) => {
        const menu = menus.find(m => m.menuId === row.menuId);
        if (!menu) {
          return null;
        }
        return (
          <div className={styles.actionGroup}>
            <Button
              variant='ghost'
              size='sm'
              title='Edit'
              aria-label='Edit'
              onClick={() => openEditMenu(menu)}
            >
              <Pencil size='1em' aria-hidden />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              title='Delete'
              aria-label='Delete'
              onClick={() => handleDeleteMenu(menu)}
            >
              <Trash2 size='1em' aria-hidden />
            </Button>
          </div>
        );
      },
    },
  ];

  const contentPanel = (
    <Stack spacing='md'>
      <SearchToolbar
        searchValue={contentSearch}
        onSearchChange={setContentSearch}
        searchPlaceholder='Search by title or slug…'
        filterConfig={[
          {
            name: 'contentType',
            label: 'Type',
            type: 'select',
            options: [{ value: 'all', label: 'All types' }, ...CONTENT_TYPE_OPTIONS],
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'archived', label: 'Archived' },
            ],
          },
        ]}
        filters={{ contentType: contentTypeFilter || 'all', status: statusFilter || 'all' }}
        onFilterChange={handleFilterChange}
      />

      {contentQuery.isError && <ErrorState size='sm' title='Failed to load content' />}

      <DataTable
        frameless
        surface
        columns={contentColumns}
        rows={contentList.map(item => ({ ...item }))}
        loading={contentQuery.isLoading}
        emptyMessage='No content found. Create your first page or article.'
        getRowId={row => String(row.contentId)}
      />
    </Stack>
  );

  const menusPanel = (
    <DataTable
      frameless
      surface
      columns={menuColumns}
      rows={menus.map(menu => ({ ...menu }))}
      loading={menusQuery.isLoading}
      emptyMessage='No navigation menus yet.'
      getRowId={row => String(row.menuId)}
    />
  );

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Content Management'
        description='Manage pages, articles, and navigation menus'
        actions={
          activeTab === 'content' ? (
            <Button variant='primary' onClick={openCreateContent}>
              <Plus size='1em' />
              New Content
            </Button>
          ) : (
            <Button variant='primary' onClick={openCreateMenu}>
              <Plus size='1em' />
              New Menu
            </Button>
          )
        }
      />

      <Tabs
        aria-label='Content sections'
        value={activeTab}
        onChange={id => setActiveTab(id === 'menus' ? 'menus' : 'content')}
        tabs={[
          { id: 'content', label: 'Content', content: contentPanel },
          {
            id: 'menus',
            label: (
              <>
                <Menu size='1em' aria-hidden />
                Navigation Menus
              </>
            ),
            content: menusPanel,
          },
        ]}
      />

      <Modal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        title={editingContent ? 'Edit Content' : 'New Content'}
        size='lg'
        footer={
          <>
            <Button variant='secondary' onClick={() => setShowContentModal(false)}>
              Cancel
            </Button>
            <Button variant='primary' onClick={handleSaveContent} disabled={saving}>
              {saving ? 'Saving…' : editingContent ? 'Save Changes' : 'Create Content'}
            </Button>
          </>
        }
      >
        <Stack spacing='md'>
          <FormField label='Title' htmlFor='cm-title' required>
            <Input
              id='cm-title'
              value={contentForm.title}
              onChange={e => setContentForm(f => ({ ...f, title: e.target.value }))}
              onBlur={() => !editingContent && !contentForm.slug && handleSlugGenerate()}
              placeholder='Enter content title'
            />
          </FormField>
          <FormRow columns='two'>
            <FormField label='Slug' htmlFor='cm-slug'>
              <div className={styles.slugInputRow}>
                <Input
                  id='cm-slug'
                  value={contentForm.slug}
                  onChange={e => setContentForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder='auto-generated'
                  disabled={!!editingContent}
                />
                {!editingContent && (
                  <Button variant='secondary' onClick={handleSlugGenerate}>
                    Generate
                  </Button>
                )}
              </div>
            </FormField>
            <SelectInput
              label='Content Type'
              value={contentForm.contentType}
              onChange={value =>
                setContentForm(f => ({
                  ...f,
                  contentType: CONTENT_TYPES.find(t => t === singleValue(value)) ?? f.contentType,
                }))
              }
              options={CONTENT_TYPE_OPTIONS}
              disabled={!!editingContent}
              fullWidth
            />
          </FormRow>
          <FormField label='Content (HTML)' htmlFor='cm-content' required>
            <TextArea
              id='cm-content'
              value={contentForm.content}
              onChange={e => setContentForm(f => ({ ...f, content: e.target.value }))}
              placeholder='Enter HTML content…'
              rows={8}
            />
          </FormField>
          <FormField label='Excerpt' htmlFor='cm-excerpt'>
            <TextArea
              id='cm-excerpt'
              value={contentForm.excerpt}
              onChange={e => setContentForm(f => ({ ...f, excerpt: e.target.value }))}
              placeholder='Short summary for listings and SEO'
              rows={3}
            />
          </FormField>
          <FormSection title='SEO Settings'>
            <Stack spacing='md'>
              <FormField label='Meta Title' htmlFor='cm-meta-title'>
                <Input
                  id='cm-meta-title'
                  value={contentForm.metaTitle}
                  onChange={e => setContentForm(f => ({ ...f, metaTitle: e.target.value }))}
                  placeholder='SEO title (defaults to content title)'
                />
              </FormField>
              <FormField label='Meta Description' htmlFor='cm-meta-desc'>
                <TextArea
                  id='cm-meta-desc'
                  value={contentForm.metaDescription}
                  onChange={e => setContentForm(f => ({ ...f, metaDescription: e.target.value }))}
                  placeholder='SEO description'
                  rows={2}
                />
              </FormField>
              <FormField label='Meta Keywords (comma-separated)' htmlFor='cm-meta-kw'>
                <Input
                  id='cm-meta-kw'
                  value={contentForm.metaKeywords}
                  onChange={e => setContentForm(f => ({ ...f, metaKeywords: e.target.value }))}
                  placeholder='keyword1, keyword2, keyword3'
                />
              </FormField>
            </Stack>
          </FormSection>
          <FormRow columns='two'>
            <FormField label='Featured Image URL' htmlFor='cm-featured-image'>
              <Input
                id='cm-featured-image'
                value={contentForm.featuredImageUrl}
                onChange={e => setContentForm(f => ({ ...f, featuredImageUrl: e.target.value }))}
                placeholder='https://…'
              />
            </FormField>
            <FormField label='Schedule Publish At' htmlFor='cm-schedule'>
              <Input
                id='cm-schedule'
                type='datetime-local'
                value={contentForm.scheduledPublishAt}
                onChange={e => setContentForm(f => ({ ...f, scheduledPublishAt: e.target.value }))}
              />
            </FormField>
            <FormField label='Schedule Unpublish At' htmlFor='cm-schedule-unpublish'>
              <Input
                id='cm-schedule-unpublish'
                type='datetime-local'
                value={contentForm.scheduledUnpublishAt}
                onChange={e =>
                  setContentForm(f => ({ ...f, scheduledUnpublishAt: e.target.value }))
                }
              />
            </FormField>
            {editingContent && (
              <FormField label='Change Note' htmlFor='cm-change-note'>
                <Input
                  id='cm-change-note'
                  value={contentForm.changeNote}
                  onChange={e => setContentForm(f => ({ ...f, changeNote: e.target.value }))}
                  placeholder='Describe what changed (optional)'
                />
              </FormField>
            )}
          </FormRow>
          {formError && <Alert variant='error'>{formError}</Alert>}
        </Stack>
      </Modal>

      <Modal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        title={editingMenu ? 'Edit Menu' : 'New Navigation Menu'}
        size='md'
        footer={
          <>
            <Button variant='secondary' onClick={() => setShowMenuModal(false)}>
              Cancel
            </Button>
            <Button variant='primary' onClick={handleSaveMenu} disabled={saving}>
              {saving ? 'Saving…' : editingMenu ? 'Save Changes' : 'Create Menu'}
            </Button>
          </>
        }
      >
        <Stack spacing='md'>
          <FormField label='Menu Name' htmlFor='cm-menu-name' required>
            <Input
              id='cm-menu-name'
              value={menuForm.name}
              onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))}
              placeholder='e.g. Main Navigation'
            />
          </FormField>
          <FormRow columns='two'>
            <SelectInput
              label='Location'
              value={menuForm.location}
              onChange={value =>
                setMenuForm(f => ({
                  ...f,
                  location: MENU_LOCATIONS.find(l => l === singleValue(value)) ?? f.location,
                }))
              }
              options={MENU_LOCATION_OPTIONS}
              fullWidth
            />
            <SelectInput
              label='Active'
              value={menuForm.isActive ? 'true' : 'false'}
              onChange={value =>
                setMenuForm(f => ({ ...f, isActive: singleValue(value) === 'true' }))
              }
              options={MENU_ACTIVE_OPTIONS}
              fullWidth
            />
          </FormRow>
        </Stack>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </Stack>
  );
};

export default ContentManagement;
