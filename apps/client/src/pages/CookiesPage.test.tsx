import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';

const { useLegalDocumentMock, renderLegalMarkdownMock } = vi.hoisted(() => ({
  useLegalDocumentMock: vi.fn(),
  renderLegalMarkdownMock: vi.fn((markdown: string) => `<p>${markdown}</p>`),
}));

vi.mock('@adopt-dont-shop/lib.legal', () => ({
  useLegalDocument: useLegalDocumentMock,
  renderLegalMarkdown: renderLegalMarkdownMock,
}));

import { CookiesPage } from './CookiesPage';

describe('CookiesPage', () => {
  it('shows a loading state while the cookies document is fetching', () => {
    useLegalDocumentMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderWithProviders(<CookiesPage />);

    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('renders the versioned cookies policy markdown', () => {
    useLegalDocumentMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { version: '2026-05-10-v1', contentType: 'text/markdown', content: 'We use cookies.' },
    });

    renderWithProviders(<CookiesPage />);

    expect(screen.getByRole('heading', { name: 'Cookie Policy' })).toBeInTheDocument();
    expect(screen.getByText('We use cookies.')).toBeInTheDocument();
    expect(renderLegalMarkdownMock).toHaveBeenCalledWith('We use cookies.');
  });

  it('shows a fallback message when the document fails to load', () => {
    useLegalDocumentMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    renderWithProviders(<CookiesPage />);

    expect(screen.getByRole('heading', { name: 'Cookie Policy' })).toBeInTheDocument();
    expect(screen.getByText('Content not found.')).toBeInTheDocument();
  });
});
