import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import { useQuery } from '@tanstack/react-query';

const { useLegalDocumentMock, renderLegalMarkdownMock } = vi.hoisted(() => ({
  useLegalDocumentMock: vi.fn(),
  renderLegalMarkdownMock: vi.fn((markdown: string) => `<p>${markdown}</p>`),
}));

vi.mock('@adopt-dont-shop/lib.legal', () => ({
  useLegalDocument: useLegalDocumentMock,
  renderLegalMarkdown: renderLegalMarkdownMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

import { LegalPage } from './LegalPage';

const NOT_FETCHED = { isLoading: false, isSuccess: false, isError: false, data: undefined };

describe('LegalPage', () => {
  it('shows a loading state while the legal document is fetching', () => {
    useLegalDocumentMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    vi.mocked(useQuery).mockReturnValue(NOT_FETCHED as ReturnType<typeof useQuery>);

    renderWithProviders(<LegalPage slug='terms' />);

    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('renders the versioned markdown document when no CMS override exists', () => {
    useLegalDocumentMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { version: '2026-05-10-v1', contentType: 'text/markdown', content: 'Body text.' },
    });
    vi.mocked(useQuery).mockReturnValue({
      ...NOT_FETCHED,
      isError: true, // CMS 404s on a fresh database
    } as ReturnType<typeof useQuery>);

    renderWithProviders(<LegalPage slug='terms' />);

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText('Body text.')).toBeInTheDocument();
    expect(renderLegalMarkdownMock).toHaveBeenCalledWith('Body text.');
  });

  it('prefers a CMS override page over the versioned document when one exists', () => {
    useLegalDocumentMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { version: '2026-05-10-v1', contentType: 'text/markdown', content: 'Default text.' },
    });
    vi.mocked(useQuery).mockReturnValue({
      ...NOT_FETCHED,
      isSuccess: true,
      data: { title: 'Custom Terms', content: '<p>Custom override content.</p>' },
    } as ReturnType<typeof useQuery>);

    renderWithProviders(<LegalPage slug='terms' />);

    expect(screen.getByRole('heading', { name: 'Custom Terms' })).toBeInTheDocument();
    expect(screen.getByText('Custom override content.')).toBeInTheDocument();
  });

  it('shows a fallback message when the versioned document fails to load and no CMS override exists', () => {
    useLegalDocumentMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    vi.mocked(useQuery).mockReturnValue({
      ...NOT_FETCHED,
      isError: true,
    } as ReturnType<typeof useQuery>);

    renderWithProviders(<LegalPage slug='privacy' />);

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Content not found.')).toBeInTheDocument();
  });
});
