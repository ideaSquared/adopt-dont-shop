import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContentManagement from './ContentManagement';
import { cmsService, type Content, type NavigationMenu } from '../services/cmsService';

vi.mock('../services/cmsService', () => ({
  cmsService: {
    listContent: vi.fn(),
    createContent: vi.fn(),
    updateContent: vi.fn(),
    publishContent: vi.fn(),
    unpublishContent: vi.fn(),
    archiveContent: vi.fn(),
    deleteContent: vi.fn(),
    getVersionHistory: vi.fn(),
    restoreVersion: vi.fn(),
    generateSlug: vi.fn(),
    listMenus: vi.fn(),
    getMenu: vi.fn(),
    createMenu: vi.fn(),
    updateMenu: vi.fn(),
    deleteMenu: vi.fn(),
  },
}));

const mockContent: Content[] = [
  {
    contentId: 'content-1',
    title: 'Welcome Page',
    slug: 'welcome',
    contentType: 'page',
    status: 'draft',
    content: '<h1>Welcome</h1>',
    versions: [
      {
        version: 1,
        title: 'Welcome Page',
        content: '<h1>Welcome</h1>',
        excerpt: undefined,
        changedBy: 'u1',
        changeNote: undefined,
        createdAt: '2024-01-01',
      },
    ],
    currentVersion: 1,
    authorId: 'u1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    contentId: 'content-2',
    title: 'Adoption Guide',
    slug: 'adoption-guide',
    contentType: 'help_article',
    status: 'published',
    content: '<p>Guide</p>',
    versions: [
      {
        version: 1,
        title: 'Adoption Guide',
        content: '<p>Guide</p>',
        excerpt: undefined,
        changedBy: 'u1',
        changeNote: undefined,
        createdAt: '2024-01-02',
      },
    ],
    currentVersion: 1,
    authorId: 'u1',
    publishedAt: '2024-01-02T00:00:00.000Z',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockMenus: NavigationMenu[] = [
  {
    menuId: 'menu-1',
    name: 'Main Navigation',
    location: 'header',
    items: [],
    isActive: true,
    createdBy: 'u1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <ContentManagement />
    </MemoryRouter>
  );

describe('ContentManagement page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cmsService.listContent).mockResolvedValue({
      content: mockContent,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.mocked(cmsService.listMenus).mockResolvedValue(mockMenus);
  });

  it('renders the page heading', async () => {
    renderPage();
    expect(screen.getByText('Content Management')).toBeInTheDocument();
  });

  it('displays content list after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Welcome Page')).toBeInTheDocument();
      expect(screen.getByText('Adoption Guide')).toBeInTheDocument();
    });
  });

  it('shows draft and published status badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
    });
  });

  it('shows empty state when no content exists', async () => {
    vi.mocked(cmsService.listContent).mockResolvedValue({
      content: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no content found/i)).toBeInTheDocument();
    });
  });

  it('opens create modal when New Content button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));
    fireEvent.click(screen.getByText('New Content'));
    expect(screen.getByText('New Content', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens edit modal with pre-filled data when edit button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));
    fireEvent.click(screen.getAllByTitle('Edit')[0]);
    await waitFor(() => {
      expect(screen.getByText('Edit Content')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Welcome Page')).toBeInTheDocument();
    });
  });

  it('calls createContent when form is submitted with valid data', async () => {
    vi.mocked(cmsService.createContent).mockResolvedValue(mockContent[0]);
    vi.mocked(cmsService.generateSlug).mockResolvedValue('new-page');
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));

    fireEvent.click(screen.getByText('New Content'));
    fireEvent.change(screen.getByPlaceholderText('Enter content title'), {
      target: { value: 'New Page' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter HTML content…'), {
      target: { value: '<p>Hello</p>' },
    });
    fireEvent.click(screen.getByText('Create Content'));

    await waitFor(() => {
      expect(cmsService.createContent).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Page', content: '<p>Hello</p>' })
      );
    });
  });

  it('shows validation error when title is missing', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));
    fireEvent.click(screen.getByText('New Content'));
    fireEvent.click(screen.getByText('Create Content'));
    await waitFor(() => {
      expect(screen.getByText('Title and content are required')).toBeInTheDocument();
    });
  });

  it('calls publishContent when Publish button is clicked', async () => {
    vi.mocked(cmsService.publishContent).mockResolvedValue({
      ...mockContent[0],
      status: 'published',
    });
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));
    fireEvent.click(screen.getAllByTitle('Publish')[0]);
    await waitFor(() => {
      expect(cmsService.publishContent).toHaveBeenCalledWith('content-1');
    });
  });

  it('calls deleteContent after user confirms deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(cmsService.deleteContent).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    await waitFor(() => {
      expect(cmsService.deleteContent).toHaveBeenCalledWith('content-1');
    });
  });

  it('does not delete content when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() => screen.getByText('Welcome Page'));
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    expect(cmsService.deleteContent).not.toHaveBeenCalled();
  });

  describe('Navigation Menus tab', () => {
    it('switches to menus tab and loads menus', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Welcome Page'));
      fireEvent.click(screen.getByText('Navigation Menus'));
      await waitFor(() => {
        expect(screen.getByText('Main Navigation')).toBeInTheDocument();
        expect(cmsService.listMenus).toHaveBeenCalled();
      });
    });

    it('opens create menu modal on New Menu click', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Welcome Page'));
      fireEvent.click(screen.getByText('Navigation Menus'));
      await waitFor(() => screen.getByText('Main Navigation'));
      fireEvent.click(screen.getByText('New Menu'));
      expect(screen.getByText('New Navigation Menu')).toBeInTheDocument();
    });

    it('calls createMenu on menu form submit', async () => {
      vi.mocked(cmsService.createMenu).mockResolvedValue(mockMenus[0]);
      renderPage();
      await waitFor(() => screen.getByText('Welcome Page'));
      fireEvent.click(screen.getByText('Navigation Menus'));
      await waitFor(() => screen.getByText('Main Navigation'));
      fireEvent.click(screen.getByText('New Menu'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Main Navigation'), {
        target: { value: 'Test Menu' },
      });
      fireEvent.click(screen.getByText('Create Menu'));
      await waitFor(() => {
        expect(cmsService.createMenu).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Test Menu', location: 'header' })
        );
      });
    });
  });
});
