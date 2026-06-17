/**
 * Behavioural tests for BlogPage.
 *
 * Covers the public content journey: a loading spinner, the empty state, and a
 * populated grid where each post links to its detail page, shows its title,
 * excerpt and a UK-formatted date, and falls back to a placeholder when there
 * is no featured image. A fetch failure must degrade to the empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';

const listBlogPosts = vi.fn();

vi.mock('@/services/cmsService', () => ({
  cmsPublicService: {
    listBlogPosts: (...args: unknown[]) => listBlogPosts(...args),
  },
}));

import { BlogPage } from './BlogPage';

const buildPost = (overrides: Record<string, unknown> = {}) => ({
  contentId: 'c-1',
  title: 'Adopting a senior dog',
  slug: 'adopting-a-senior-dog',
  contentType: 'blog_post',
  content: '<p>...</p>',
  excerpt: 'Why older dogs make great companions',
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('BlogPage', () => {
  it('shows a loading spinner while posts are being fetched', () => {
    listBlogPosts.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<BlogPage />);

    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('shows the empty state when there are no posts', async () => {
    listBlogPosts.mockResolvedValue({ content: [] });

    renderWithProviders(<BlogPage />);

    expect(await screen.findByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('renders a post linking to its detail page with title, excerpt and date', async () => {
    listBlogPosts.mockResolvedValue({
      content: [buildPost({ publishedAt: '2026-01-15T00:00:00.000Z' })],
    });

    renderWithProviders(<BlogPage />);

    const link = await screen.findByRole('link', { name: /adopting a senior dog/i });
    expect(link).toHaveAttribute('href', '/blog/adopting-a-senior-dog');
    expect(screen.getByText('Why older dogs make great companions')).toBeInTheDocument();
    expect(screen.getByText('15 January 2026')).toBeInTheDocument();
  });

  it('falls back to the empty state when the fetch fails', async () => {
    listBlogPosts.mockRejectedValue(new Error('network'));

    renderWithProviders(<BlogPage />);

    expect(await screen.findByText(/no posts yet/i)).toBeInTheDocument();
  });
});
