import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiArchive, FiSearch, FiMenu } from 'react-icons/fi';
import { ConfirmDialog, useConfirm } from '@adopt-dont-shop/lib.components';
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
import * as styles from './ContentManagement.css';

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

const getStatusBadgeClass = (status: string): string => {
  if (status === 'published') {
    return styles.statusBadgePublished;
  }
  if (status === 'draft') {
    return styles.statusBadgeDraft;
  }
  if (status === 'scheduled') {
    return styles.statusBadgeScheduled;
  }
  return styles.statusBadgeDefault;
};

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
  const { confirm, confirmProps } = useConfirm();

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
    if (activeTab === 'menus') {
      fetchMenus();
    }
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
    if (!contentForm.title) {
      return;
    }
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
    const confirmed = await confirm({
      title: 'Archive content?',
      message: `Archive "${item.title}"? It will be hidden from the site but kept for restoration.`,
      confirmText: 'Archive',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }
    try {
      await cmsService.archiveContent(item.contentId);
      fetchContent();
    } catch {
      // ignore
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
    if (!menuForm.name.trim()) {
      return;
    }
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
      await cmsService.deleteMenu(menu.menuId);
      fetchMenus();
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1>Content Management</h1>
          <p>Manage pages, articles, and navigation menus</p>
        </div>
        <div className={styles.headerActions}>
          {activeTab === 'content' && (
            <button className={styles.primaryButton} onClick={openCreateContent}>
              <FiPlus size={16} />
              New Content
            </button>
          )}
          {activeTab === 'menus' && (
            <button className={styles.primaryButton} onClick={openCreateMenu}>
              <FiPlus size={16} />
              New Menu
            </button>
          )}
        </div>
      </div>

      <div className={styles.tabBar}>
        <button
          className={clsx(styles.tab, activeTab === 'content' && styles.tabActive)}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={clsx(styles.tab, activeTab === 'menus' && styles.tabActive)}
          onClick={() => setActiveTab('menus')}
        >
          <FiMenu size={14} />
          Navigation Menus
        </button>
      </div>

      {activeTab === 'content' && (
        <div className={styles.card}>
          <div className={styles.filterBar}>
            <div className={styles.searchWrapper}>
              <FiSearch size={16} />
              <input
                className={styles.searchInput}
                placeholder='Search by title or slug…'
                value={contentSearch}
                onChange={e => setContentSearch(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor='cm-type-filter'>
                Type
              </label>
              <select
                id='cm-type-filter'
                className={styles.select}
                value={contentTypeFilter}
                onChange={e => setContentTypeFilter(e.target.value as ContentType | '')}
              >
                <option value=''>All types</option>
                <option value='page'>Page</option>
                <option value='blog_post'>Blog Post</option>
                <option value='help_article'>Help Article</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor='cm-status-filter'>
                Status
              </label>
              <select
                id='cm-status-filter'
                className={styles.select}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ContentStatus | '')}
              >
                <option value=''>All statuses</option>
                <option value='draft'>Draft</option>
                <option value='published'>Published</option>
                <option value='scheduled'>Scheduled</option>
                <option value='archived'>Archived</option>
              </select>
            </div>
          </div>

          {contentError && <p className={styles.errorMessage}>{contentError}</p>}

          {contentLoading ? (
            <div className={styles.emptyState}>Loading content…</div>
          ) : contentList.length === 0 ? (
            <div className={styles.emptyState}>
              No content found. Create your first page or article.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Title</th>
                  <th className={styles.th}>Slug</th>
                  <th className={styles.th}>Type</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Version</th>
                  <th className={styles.th}>Updated</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentList.map(item => (
                  <tr key={item.contentId}>
                    <td className={styles.td}>
                      <strong>{item.title}</strong>
                    </td>
                    <td
                      className={styles.td}
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}
                    >
                      /{item.slug}
                    </td>
                    <td className={styles.td}>{CONTENT_TYPE_LABELS[item.contentType]}</td>
                    <td className={styles.td}>
                      <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                    </td>
                    <td className={styles.td}>v{item.currentVersion}</td>
                    <td className={styles.td}>{new Date(item.updatedAt).toLocaleDateString()}</td>
                    <td className={styles.td}>
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.iconButtonPrimary}
                          title='Edit'
                          onClick={() => openEditContent(item)}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        {item.status !== 'published' && (
                          <button
                            className={styles.iconButtonPrimary}
                            title='Publish'
                            onClick={() => handlePublish(item)}
                          >
                            <FiEye size={14} />
                          </button>
                        )}
                        {item.status === 'published' && (
                          <button
                            className={styles.iconButton}
                            title='Unpublish'
                            onClick={() => handleUnpublish(item)}
                          >
                            <FiEye size={14} />
                          </button>
                        )}
                        {item.status !== 'archived' && (
                          <button
                            className={styles.iconButton}
                            title='Archive'
                            onClick={() => handleArchive(item)}
                          >
                            <FiArchive size={14} />
                          </button>
                        )}
                        <button
                          className={styles.iconButtonDanger}
                          title='Delete'
                          onClick={() => handleDeleteContent(item)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'menus' && (
        <div className={styles.card}>
          {menusLoading ? (
            <div className={styles.emptyState}>Loading menus…</div>
          ) : menus.length === 0 ? (
            <div className={styles.emptyState}>No navigation menus yet.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Location</th>
                  <th className={styles.th}>Items</th>
                  <th className={styles.th}>Active</th>
                  <th className={styles.th}>Updated</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menus.map(menu => (
                  <tr key={menu.menuId}>
                    <td className={styles.td}>
                      <strong>{menu.name}</strong>
                    </td>
                    <td className={styles.td} style={{ textTransform: 'capitalize' }}>
                      {menu.location}
                    </td>
                    <td className={styles.td}>{menu.items.length} items</td>
                    <td className={styles.td}>
                      <span
                        className={getStatusBadgeClass(menu.isActive ? 'published' : 'archived')}
                      >
                        {menu.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={styles.td}>{new Date(menu.updatedAt).toLocaleDateString()}</td>
                    <td className={styles.td}>
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.iconButtonPrimary}
                          title='Edit'
                          onClick={() => openEditMenu(menu)}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className={styles.iconButtonDanger}
                          title='Delete'
                          onClick={() => handleDeleteMenu(menu)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showContentModal && (
        <div
          className={styles.overlay}
          onClick={e => e.target === e.currentTarget && setShowContentModal(false)}
          onKeyDown={e => e.key === 'Escape' && setShowContentModal(false)}
          role='presentation'
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingContent ? 'Edit Content' : 'New Content'}</h2>
              <button className={styles.closeButton} onClick={() => setShowContentModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor='cm-title'>
                  Title *
                </label>
                <input
                  id='cm-title'
                  className={styles.formInput}
                  value={contentForm.title}
                  onChange={e => setContentForm(f => ({ ...f, title: e.target.value }))}
                  onBlur={() => !editingContent && !contentForm.slug && handleSlugGenerate()}
                  placeholder='Enter content title'
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-slug'>
                  Slug
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id='cm-slug'
                    className={styles.formInput}
                    style={{ flex: 1 }}
                    value={contentForm.slug}
                    onChange={e => setContentForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder='auto-generated'
                    disabled={!!editingContent}
                  />
                  {!editingContent && (
                    <button
                      className={styles.secondaryButton}
                      type='button'
                      onClick={handleSlugGenerate}
                    >
                      Generate
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-content-type'>
                  Content Type
                </label>
                <select
                  id='cm-content-type'
                  className={styles.formSelect}
                  value={contentForm.contentType}
                  onChange={e =>
                    setContentForm(f => ({ ...f, contentType: e.target.value as ContentType }))
                  }
                  disabled={!!editingContent}
                >
                  <option value='page'>Page</option>
                  <option value='blog_post'>Blog Post</option>
                  <option value='help_article'>Help Article</option>
                </select>
              </div>
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor='cm-content'>
                  Content (HTML) *
                </label>
                <textarea
                  id='cm-content'
                  className={styles.formTextarea}
                  value={contentForm.content}
                  onChange={e => setContentForm(f => ({ ...f, content: e.target.value }))}
                  placeholder='Enter HTML content…'
                />
              </div>
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor='cm-excerpt'>
                  Excerpt
                </label>
                <textarea
                  id='cm-excerpt'
                  className={styles.formTextarea}
                  style={{ minHeight: '80px' }}
                  value={contentForm.excerpt}
                  onChange={e => setContentForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder='Short summary for listings and SEO'
                />
              </div>
              <div className={styles.seoSection}>
                <p className={styles.seoTitle}>SEO Settings</p>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel} htmlFor='cm-meta-title'>
                    Meta Title
                  </label>
                  <input
                    id='cm-meta-title'
                    className={styles.formInput}
                    value={contentForm.metaTitle}
                    onChange={e => setContentForm(f => ({ ...f, metaTitle: e.target.value }))}
                    placeholder='SEO title (defaults to content title)'
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel} htmlFor='cm-meta-desc'>
                    Meta Description
                  </label>
                  <textarea
                    id='cm-meta-desc'
                    className={styles.formTextarea}
                    style={{ minHeight: '70px' }}
                    value={contentForm.metaDescription}
                    onChange={e => setContentForm(f => ({ ...f, metaDescription: e.target.value }))}
                    placeholder='SEO description'
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel} htmlFor='cm-meta-kw'>
                    Meta Keywords (comma-separated)
                  </label>
                  <input
                    id='cm-meta-kw'
                    className={styles.formInput}
                    value={contentForm.metaKeywords}
                    onChange={e => setContentForm(f => ({ ...f, metaKeywords: e.target.value }))}
                    placeholder='keyword1, keyword2, keyword3'
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-featured-image'>
                  Featured Image URL
                </label>
                <input
                  id='cm-featured-image'
                  className={styles.formInput}
                  value={contentForm.featuredImageUrl}
                  onChange={e => setContentForm(f => ({ ...f, featuredImageUrl: e.target.value }))}
                  placeholder='https://…'
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-schedule'>
                  Schedule Publish At
                </label>
                <input
                  id='cm-schedule'
                  className={styles.formInput}
                  type='datetime-local'
                  value={contentForm.scheduledPublishAt}
                  onChange={e =>
                    setContentForm(f => ({ ...f, scheduledPublishAt: e.target.value }))
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-schedule-unpublish'>
                  Schedule Unpublish At
                </label>
                <input
                  id='cm-schedule-unpublish'
                  className={styles.formInput}
                  type='datetime-local'
                  value={contentForm.scheduledUnpublishAt}
                  onChange={e =>
                    setContentForm(f => ({ ...f, scheduledUnpublishAt: e.target.value }))
                  }
                />
              </div>
              {editingContent && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor='cm-change-note'>
                    Change Note
                  </label>
                  <input
                    id='cm-change-note'
                    className={styles.formInput}
                    value={contentForm.changeNote}
                    onChange={e => setContentForm(f => ({ ...f, changeNote: e.target.value }))}
                    placeholder='Describe what changed (optional)'
                  />
                </div>
              )}
            </div>
            {formError && <p className={styles.errorMessage}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setShowContentModal(false)}>
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleSaveContent}
                disabled={saving}
              >
                {saving ? 'Saving…' : editingContent ? 'Save Changes' : 'Create Content'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMenuModal && (
        <div
          className={styles.overlay}
          onClick={e => e.target === e.currentTarget && setShowMenuModal(false)}
          onKeyDown={e => e.key === 'Escape' && setShowMenuModal(false)}
          role='presentation'
        >
          <div className={styles.modal} style={{ maxWidth: '480px' }}>
            <div className={styles.modalHeader}>
              <h2>{editingMenu ? 'Edit Menu' : 'New Navigation Menu'}</h2>
              <button className={styles.closeButton} onClick={() => setShowMenuModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel} htmlFor='cm-menu-name'>
                  Menu Name *
                </label>
                <input
                  id='cm-menu-name'
                  className={styles.formInput}
                  value={menuForm.name}
                  onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))}
                  placeholder='e.g. Main Navigation'
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-menu-location'>
                  Location
                </label>
                <select
                  id='cm-menu-location'
                  className={styles.formSelect}
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
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor='cm-menu-active'>
                  Active
                </label>
                <select
                  id='cm-menu-active'
                  className={styles.formSelect}
                  value={menuForm.isActive ? 'true' : 'false'}
                  onChange={e => setMenuForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
                >
                  <option value='true'>Active</option>
                  <option value='false'>Inactive</option>
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setShowMenuModal(false)}>
                Cancel
              </button>
              <button className={styles.primaryButton} onClick={handleSaveMenu} disabled={saving}>
                {saving ? 'Saving…' : editingMenu ? 'Save Changes' : 'Create Menu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default ContentManagement;
