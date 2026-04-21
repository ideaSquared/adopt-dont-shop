import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiArchive, FiSearch, FiMenu } from 'react-icons/fi';
import {
  cmsService,
  type Content,
  type ContentType,
  type ContentStatus,
  type NavigationMenu,
  type CreateContentInput,
  type UpdateContentInput,
  type CreateMenuInput,
} from '../services/cmsService';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderLeft = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }
  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${p => (p.$active ? '#2563eb' : 'transparent')};
  margin-bottom: -2px;
  color: ${p => (p.$active ? '#2563eb' : '#6b7280')};
  font-weight: ${p => (p.$active ? 600 : 400)};
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const Card = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 160px;
`;

const FilterLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
  color: #111827;
  cursor: pointer;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 2;
  min-width: 220px;
  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  box-sizing: border-box;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const Td = styled.td`
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem;
  color: #374151;
  vertical-align: middle;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${p => {
    if (p.$status === 'published') return '#d1fae5';
    if (p.$status === 'draft') return '#fef3c7';
    if (p.$status === 'scheduled') return '#dbeafe';
    return '#f3f4f6';
  }};
  color: ${p => {
    if (p.$status === 'published') return '#065f46';
    if (p.$status === 'draft') return '#92400e';
    if (p.$status === 'scheduled') return '#1e40af';
    return '#374151';
  }};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const IconButton = styled.button<{ $variant?: 'danger' | 'primary' | 'default' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border-radius: 6px;
  border: 1px solid
    ${p => {
      if (p.$variant === 'danger') return '#fca5a5';
      if (p.$variant === 'primary') return '#93c5fd';
      return '#e5e7eb';
    }};
  background: ${p =>
    p.$variant === 'danger' ? '#fef2f2' : p.$variant === 'primary' ? '#eff6ff' : '#fff'};
  color: ${p =>
    p.$variant === 'danger' ? '#dc2626' : p.$variant === 'primary' ? '#2563eb' : '#6b7280'};
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: #1d4ed8;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #111827;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div<{ $full?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  ${p => (p.$full ? 'grid-column: 1 / -1;' : '')}
`;

const FormLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
`;

const FormInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  &:focus {
    outline: none;
    border-color: #2563eb;
  }
  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
  }
`;

const FormTextarea = styled.textarea`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 200px;
  font-family: monospace;
  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`;

const FormSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
`;

const SecondaryButton = styled.button`
  padding: 0.625rem 1.25rem;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.95rem;
`;

const ErrorMessage = styled.p`
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
`;

const SeoSection = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #f9fafb;
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SeoTitle = styled.p`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

type ActiveTab = 'content' | 'menus';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  page: 'Page',
  blog_post: 'Blog Post',
  help_article: 'Help Article',
};

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

const ContentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('content');
  const [contentList, setContentList] = useState<Content[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentForm, setContentForm] = useState<ContentFormState>(emptyContentForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<NavigationMenu | null>(null);
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm());

  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      const result = await cmsService.listContent({
        contentType: contentTypeFilter || undefined,
        status: statusFilter || undefined,
        search: contentSearch || undefined,
      });
      setContentList(result.content);
    } catch {
      setContentError('Failed to load content');
    } finally {
      setContentLoading(false);
    }
  }, [contentTypeFilter, statusFilter, contentSearch]);

  const fetchMenus = useCallback(async () => {
    setMenusLoading(true);
    try {
      const result = await cmsService.listMenus();
      setMenus(result);
    } finally {
      setMenusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (activeTab === 'menus') fetchMenus();
  }, [activeTab, fetchMenus]);

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
    if (!contentForm.title) return;
    try {
      const slug = await cmsService.generateSlug(contentForm.title);
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
    setSaving(true);
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
        await cmsService.updateContent(editingContent.contentId, input);
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
        await cmsService.createContent(input);
      }
      setShowContentModal(false);
      fetchContent();
    } catch (err) {
      setFormError((err as Error).message ?? 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item: Content) => {
    try {
      await cmsService.publishContent(item.contentId);
      fetchContent();
    } catch {
      // ignore
    }
  };

  const handleUnpublish = async (item: Content) => {
    try {
      await cmsService.unpublishContent(item.contentId);
      fetchContent();
    } catch {
      // ignore
    }
  };

  const handleArchive = async (item: Content) => {
    if (!window.confirm(`Archive "${item.title}"?`)) return;
    try {
      await cmsService.archiveContent(item.contentId);
      fetchContent();
    } catch {
      // ignore
    }
  };

  const handleDeleteContent = async (item: Content) => {
    if (!window.confirm(`Permanently delete "${item.title}"?`)) return;
    try {
      await cmsService.deleteContent(item.contentId);
      fetchContent();
    } catch {
      // ignore
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
    if (!menuForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingMenu) {
        await cmsService.updateMenu(editingMenu.menuId, menuForm);
      } else {
        const input: CreateMenuInput = {
          name: menuForm.name,
          location: menuForm.location,
          isActive: menuForm.isActive,
          items: [],
        };
        await cmsService.createMenu(input);
      }
      setShowMenuModal(false);
      fetchMenus();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (menu: NavigationMenu) => {
    if (!window.confirm(`Delete menu "${menu.name}"?`)) return;
    try {
      await cmsService.deleteMenu(menu.menuId);
      fetchMenus();
    } catch {
      // ignore
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <h1>Content Management</h1>
          <p>Manage pages, articles, and navigation menus</p>
        </HeaderLeft>
        <HeaderActions>
          {activeTab === 'content' && (
            <PrimaryButton onClick={openCreateContent}>
              <FiPlus size={16} />
              New Content
            </PrimaryButton>
          )}
          {activeTab === 'menus' && (
            <PrimaryButton onClick={openCreateMenu}>
              <FiPlus size={16} />
              New Menu
            </PrimaryButton>
          )}
        </HeaderActions>
      </PageHeader>

      <TabBar>
        <Tab $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
          Content
        </Tab>
        <Tab $active={activeTab === 'menus'} onClick={() => setActiveTab('menus')}>
          <FiMenu size={14} />
          Navigation Menus
        </Tab>
      </TabBar>

      {activeTab === 'content' && (
        <Card>
          <FilterBar>
            <SearchWrapper>
              <FiSearch size={16} />
              <SearchInput
                placeholder='Search by title or slug…'
                value={contentSearch}
                onChange={e => setContentSearch(e.target.value)}
              />
            </SearchWrapper>
            <FilterGroup>
              <FilterLabel>Type</FilterLabel>
              <Select
                value={contentTypeFilter}
                onChange={e => setContentTypeFilter(e.target.value as ContentType | '')}
              >
                <option value=''>All types</option>
                <option value='page'>Page</option>
                <option value='blog_post'>Blog Post</option>
                <option value='help_article'>Help Article</option>
              </Select>
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>Status</FilterLabel>
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ContentStatus | '')}
              >
                <option value=''>All statuses</option>
                <option value='draft'>Draft</option>
                <option value='published'>Published</option>
                <option value='scheduled'>Scheduled</option>
                <option value='archived'>Archived</option>
              </Select>
            </FilterGroup>
          </FilterBar>

          {contentError && <ErrorMessage>{contentError}</ErrorMessage>}

          {contentLoading ? (
            <EmptyState>Loading content…</EmptyState>
          ) : contentList.length === 0 ? (
            <EmptyState>No content found. Create your first page or article.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Slug</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Version</Th>
                  <Th>Updated</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {contentList.map(item => (
                  <tr key={item.contentId}>
                    <Td>
                      <strong>{item.title}</strong>
                    </Td>
                    <Td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
                      /{item.slug}
                    </Td>
                    <Td>{CONTENT_TYPE_LABELS[item.contentType]}</Td>
                    <Td>
                      <StatusBadge $status={item.status}>{item.status}</StatusBadge>
                    </Td>
                    <Td>v{item.currentVersion}</Td>
                    <Td>{new Date(item.updatedAt).toLocaleDateString()}</Td>
                    <Td>
                      <ActionGroup>
                        <IconButton
                          $variant='primary'
                          title='Edit'
                          onClick={() => openEditContent(item)}
                        >
                          <FiEdit2 size={14} />
                        </IconButton>
                        {item.status !== 'published' && (
                          <IconButton
                            $variant='primary'
                            title='Publish'
                            onClick={() => handlePublish(item)}
                          >
                            <FiEye size={14} />
                          </IconButton>
                        )}
                        {item.status === 'published' && (
                          <IconButton title='Unpublish' onClick={() => handleUnpublish(item)}>
                            <FiEye size={14} />
                          </IconButton>
                        )}
                        {item.status !== 'archived' && (
                          <IconButton title='Archive' onClick={() => handleArchive(item)}>
                            <FiArchive size={14} />
                          </IconButton>
                        )}
                        <IconButton
                          $variant='danger'
                          title='Delete'
                          onClick={() => handleDeleteContent(item)}
                        >
                          <FiTrash2 size={14} />
                        </IconButton>
                      </ActionGroup>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === 'menus' && (
        <Card>
          {menusLoading ? (
            <EmptyState>Loading menus…</EmptyState>
          ) : menus.length === 0 ? (
            <EmptyState>No navigation menus yet.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Location</Th>
                  <Th>Items</Th>
                  <Th>Active</Th>
                  <Th>Updated</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {menus.map(menu => (
                  <tr key={menu.menuId}>
                    <Td>
                      <strong>{menu.name}</strong>
                    </Td>
                    <Td style={{ textTransform: 'capitalize' }}>{menu.location}</Td>
                    <Td>{menu.items.length} items</Td>
                    <Td>
                      <StatusBadge $status={menu.isActive ? 'published' : 'archived'}>
                        {menu.isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </Td>
                    <Td>{new Date(menu.updatedAt).toLocaleDateString()}</Td>
                    <Td>
                      <ActionGroup>
                        <IconButton
                          $variant='primary'
                          title='Edit'
                          onClick={() => openEditMenu(menu)}
                        >
                          <FiEdit2 size={14} />
                        </IconButton>
                        <IconButton
                          $variant='danger'
                          title='Delete'
                          onClick={() => handleDeleteMenu(menu)}
                        >
                          <FiTrash2 size={14} />
                        </IconButton>
                      </ActionGroup>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {showContentModal && (
        <Overlay onClick={e => e.target === e.currentTarget && setShowContentModal(false)}>
          <Modal>
            <ModalHeader>
              <h2>{editingContent ? 'Edit Content' : 'New Content'}</h2>
              <CloseButton onClick={() => setShowContentModal(false)}>×</CloseButton>
            </ModalHeader>
            <FormGrid>
              <FormGroup $full>
                <FormLabel>Title *</FormLabel>
                <FormInput
                  value={contentForm.title}
                  onChange={e => setContentForm(f => ({ ...f, title: e.target.value }))}
                  onBlur={() => !editingContent && !contentForm.slug && handleSlugGenerate()}
                  placeholder='Enter content title'
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Slug</FormLabel>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <FormInput
                    style={{ flex: 1 }}
                    value={contentForm.slug}
                    onChange={e => setContentForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder='auto-generated'
                    disabled={!!editingContent}
                  />
                  {!editingContent && (
                    <SecondaryButton type='button' onClick={handleSlugGenerate}>
                      Generate
                    </SecondaryButton>
                  )}
                </div>
              </FormGroup>
              <FormGroup>
                <FormLabel>Content Type</FormLabel>
                <FormSelect
                  value={contentForm.contentType}
                  onChange={e =>
                    setContentForm(f => ({ ...f, contentType: e.target.value as ContentType }))
                  }
                  disabled={!!editingContent}
                >
                  <option value='page'>Page</option>
                  <option value='blog_post'>Blog Post</option>
                  <option value='help_article'>Help Article</option>
                </FormSelect>
              </FormGroup>
              <FormGroup $full>
                <FormLabel>Content (HTML) *</FormLabel>
                <FormTextarea
                  value={contentForm.content}
                  onChange={e => setContentForm(f => ({ ...f, content: e.target.value }))}
                  placeholder='Enter HTML content…'
                />
              </FormGroup>
              <FormGroup $full>
                <FormLabel>Excerpt</FormLabel>
                <FormTextarea
                  style={{ minHeight: '80px' }}
                  value={contentForm.excerpt}
                  onChange={e => setContentForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder='Short summary for listings and SEO'
                />
              </FormGroup>
              <SeoSection>
                <SeoTitle>SEO Settings</SeoTitle>
                <FormGroup $full>
                  <FormLabel>Meta Title</FormLabel>
                  <FormInput
                    value={contentForm.metaTitle}
                    onChange={e => setContentForm(f => ({ ...f, metaTitle: e.target.value }))}
                    placeholder='SEO title (defaults to content title)'
                  />
                </FormGroup>
                <FormGroup $full>
                  <FormLabel>Meta Description</FormLabel>
                  <FormTextarea
                    style={{ minHeight: '70px' }}
                    value={contentForm.metaDescription}
                    onChange={e => setContentForm(f => ({ ...f, metaDescription: e.target.value }))}
                    placeholder='SEO description'
                  />
                </FormGroup>
                <FormGroup $full>
                  <FormLabel>Meta Keywords (comma-separated)</FormLabel>
                  <FormInput
                    value={contentForm.metaKeywords}
                    onChange={e => setContentForm(f => ({ ...f, metaKeywords: e.target.value }))}
                    placeholder='keyword1, keyword2, keyword3'
                  />
                </FormGroup>
              </SeoSection>
              <FormGroup>
                <FormLabel>Featured Image URL</FormLabel>
                <FormInput
                  value={contentForm.featuredImageUrl}
                  onChange={e => setContentForm(f => ({ ...f, featuredImageUrl: e.target.value }))}
                  placeholder='https://…'
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Schedule Publish At</FormLabel>
                <FormInput
                  type='datetime-local'
                  value={contentForm.scheduledPublishAt}
                  onChange={e =>
                    setContentForm(f => ({ ...f, scheduledPublishAt: e.target.value }))
                  }
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Schedule Unpublish At</FormLabel>
                <FormInput
                  type='datetime-local'
                  value={contentForm.scheduledUnpublishAt}
                  onChange={e =>
                    setContentForm(f => ({ ...f, scheduledUnpublishAt: e.target.value }))
                  }
                />
              </FormGroup>
              {editingContent && (
                <FormGroup>
                  <FormLabel>Change Note</FormLabel>
                  <FormInput
                    value={contentForm.changeNote}
                    onChange={e => setContentForm(f => ({ ...f, changeNote: e.target.value }))}
                    placeholder='Describe what changed (optional)'
                  />
                </FormGroup>
              )}
            </FormGrid>
            {formError && <ErrorMessage>{formError}</ErrorMessage>}
            <ModalActions>
              <SecondaryButton onClick={() => setShowContentModal(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSaveContent} disabled={saving}>
                {saving ? 'Saving…' : editingContent ? 'Save Changes' : 'Create Content'}
              </PrimaryButton>
            </ModalActions>
          </Modal>
        </Overlay>
      )}

      {showMenuModal && (
        <Overlay onClick={e => e.target === e.currentTarget && setShowMenuModal(false)}>
          <Modal style={{ maxWidth: '480px' }}>
            <ModalHeader>
              <h2>{editingMenu ? 'Edit Menu' : 'New Navigation Menu'}</h2>
              <CloseButton onClick={() => setShowMenuModal(false)}>×</CloseButton>
            </ModalHeader>
            <FormGrid>
              <FormGroup $full>
                <FormLabel>Menu Name *</FormLabel>
                <FormInput
                  value={menuForm.name}
                  onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))}
                  placeholder='e.g. Main Navigation'
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Location</FormLabel>
                <FormSelect
                  value={menuForm.location}
                  onChange={e =>
                    setMenuForm(f => ({
                      ...f,
                      location: e.target.value as MenuFormState['location'],
                    }))
                  }
                >
                  <option value='header'>Header</option>
                  <option value='footer'>Footer</option>
                  <option value='sidebar'>Sidebar</option>
                </FormSelect>
              </FormGroup>
              <FormGroup>
                <FormLabel>Active</FormLabel>
                <FormSelect
                  value={menuForm.isActive ? 'true' : 'false'}
                  onChange={e => setMenuForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
                >
                  <option value='true'>Active</option>
                  <option value='false'>Inactive</option>
                </FormSelect>
              </FormGroup>
            </FormGrid>
            <ModalActions>
              <SecondaryButton onClick={() => setShowMenuModal(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSaveMenu} disabled={saving}>
                {saving ? 'Saving…' : editingMenu ? 'Save Changes' : 'Create Menu'}
              </PrimaryButton>
            </ModalActions>
          </Modal>
        </Overlay>
      )}
    </PageContainer>
  );
};

export default ContentManagement;
