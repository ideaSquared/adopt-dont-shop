import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test-utils/render';
import { BlogPostPage } from './BlogPostPage';

vi.mock('@/services/cmsService', () => ({
  cmsPublicService: {
    getBlogPost: vi.fn(),
  },
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ slug: 'test-post' }),
    useNavigate: () => navigateMock,
  };
});

import { cmsPublicService } from '@/services/cmsService';

const makeBlogPost = (content: string) => ({
  contentId: 'post-1',
  title: 'Test Post',
  slug: 'test-post',
  contentType: 'blog_post' as const,
  content,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('BlogPostPage – XSS sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips script tags from rendered CMS content', async () => {
    vi.mocked(cmsPublicService.getBlogPost).mockResolvedValue(
      makeBlogPost('<p>Safe content</p><script>alert("xss")</script>')
    );

    const { container } = render(<BlogPostPage />);

    await screen.findByRole('heading', { name: 'Test Post' });

    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('Safe content');
  });

  it('strips event handler attributes from rendered CMS content', async () => {
    vi.mocked(cmsPublicService.getBlogPost).mockResolvedValue(
      makeBlogPost('<p onclick="alert(1)">Click me</p>')
    );

    const { container } = render(<BlogPostPage />);

    await screen.findByRole('heading', { name: 'Test Post' });

    const paragraph = container.querySelector('p');
    expect(paragraph?.getAttribute('onclick')).toBeNull();
    expect(container).toHaveTextContent('Click me');
  });

  it('preserves safe HTML in rendered CMS content', async () => {
    vi.mocked(cmsPublicService.getBlogPost).mockResolvedValue(
      makeBlogPost('<h2>Section title</h2><p>Normal <strong>text</strong></p>')
    );

    const { container } = render(<BlogPostPage />);

    await screen.findByRole('heading', { name: 'Test Post' });

    expect(container.querySelector('h2')).not.toBeNull();
    expect(container.querySelector('strong')).not.toBeNull();
  });
});

describe('BlogPostPage – missing post', () => {
  it('sends the reader back to the blog when the post cannot be loaded', async () => {
    vi.mocked(cmsPublicService.getBlogPost).mockRejectedValue(new Error('404'));

    render(<BlogPostPage />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/blog', { replace: true });
    });
  });
});
