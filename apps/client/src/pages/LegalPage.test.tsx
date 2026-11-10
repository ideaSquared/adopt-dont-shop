import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';

const { useLegalDocumentMock } = vi.hoisted(() => ({ useLegalDocumentMock: vi.fn() }));

vi.mock('@adopt-dont-shop/lib.legal', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.legal')>()),
  useLegalDocument: useLegalDocumentMock,
}));

const { getStaticPageMock } = vi.hoisted(() => ({ getStaticPageMock: vi.fn() }));

vi.mock('@/services/cmsService', () => ({
  cmsPublicService: { getStaticPage: getStaticPageMock },
}));

import { LegalPage } from './LegalPage';

describe('LegalPage', () => {
  it('shows a loading state while the legal document is fetching', () => {
    useLegalDocumentMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    getStaticPageMock.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<LegalPage slug='terms' />);

    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('renders the versioned markdown document when no CMS override exists', async () => {
    useLegalDocumentMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        version: '2026-05-10-v1',
        contentType: 'text/markdown',
        content:
          '# Terms of Service\n\n> Maintainer note.\n\n**Version:** 2026-05-10-v1\n**Last updated:** 10 May 2026\n\n## 1. Acceptance\n\nBody text.',
      },
    });
    getStaticPageMock.mockRejectedValue(new Error('404')); // CMS 404s on a fresh database

    renderWithProviders(<LegalPage slug='terms' />);

    expect(await screen.findByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText('Body text.')).toBeInTheDocument();
    expect(screen.getByText('Last updated 10 May 2026')).toBeInTheDocument();
    expect(screen.queryByText('Maintainer note.')).not.toBeInTheDocument();
  });

  it('prefers a CMS override page over the versioned document when one exists', async () => {
    useLegalDocumentMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { version: '2026-05-10-v1', contentType: 'text/markdown', content: 'Default text.' },
    });
    getStaticPageMock.mockResolvedValue({
      title: 'Custom Terms',
      content: '<p>Custom override content.</p>',
    });

    renderWithProviders(<LegalPage slug='terms' />);

    expect(await screen.findByRole('heading', { name: 'Custom Terms' })).toBeInTheDocument();
    expect(screen.getByText('Custom override content.')).toBeInTheDocument();
  });

  it('shows a fallback message when the versioned document fails to load and no CMS override exists', async () => {
    useLegalDocumentMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    getStaticPageMock.mockRejectedValue(new Error('404'));

    renderWithProviders(<LegalPage slug='privacy' />);

    expect(await screen.findByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Content not found.')).toBeInTheDocument();
  });
});
