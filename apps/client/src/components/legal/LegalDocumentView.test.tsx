import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { parseLegalDocument } from '@adopt-dont-shop/lib.legal';
import { renderWithProviders, screen } from '../../test-utils';
import { LegalDocumentView } from './LegalDocumentView';

const document = parseLegalDocument(
  [
    '# Privacy Policy',
    '**Version:** 2026-09-07-v2\n**Last updated:** 7 September 2026',
    '## 1. Who we are',
    'We are the controller. Read our [Terms](./terms.md).',
    '## 2. What we collect',
    'Account details.',
  ].join('\n\n')
);

describe('LegalDocumentView', () => {
  it('shows the title with when it was last updated and its version', () => {
    renderWithProviders(<LegalDocumentView slug='privacy' document={document} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Last updated 7 September 2026')).toBeInTheDocument();
    expect(screen.getByText('Version 2026-09-07-v2')).toBeInTheDocument();
  });

  it('links between the three legal documents and marks the current one', () => {
    window.history.pushState({}, '', '/privacy');
    renderWithProviders(<LegalDocumentView slug='privacy' document={document} />);

    const nav = screen.getByRole('navigation', { name: 'Legal documents' });
    expect(nav).toHaveTextContent('Terms');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/cookies');
  });

  it('offers an index that jumps to each section', () => {
    renderWithProviders(<LegalDocumentView slug='privacy' document={document} />);

    const index = screen.getByRole('navigation', { name: 'On this page' });
    expect(index).toHaveTextContent('1. Who we are');
    expect(screen.getByRole('link', { name: '2. What we collect' })).toHaveAttribute(
      'href',
      '#section-2-what-we-collect'
    );
    expect(screen.getByRole('heading', { name: '2. What we collect' })).toHaveAttribute(
      'id',
      'section-2-what-we-collect'
    );
  });

  it('opens a link to a sibling document without reloading the app', async () => {
    window.history.pushState({}, '', '/privacy');
    renderWithProviders(<LegalDocumentView slug='privacy' document={document} />);

    await userEvent.click(screen.getByText('Terms', { selector: 'p a' }));

    expect(window.location.pathname).toBe('/terms');
  });

  it('omits the section index when the document has no sections', () => {
    renderWithProviders(
      <LegalDocumentView slug='terms' document={parseLegalDocument('Just some text.')} />
    );

    expect(screen.queryByRole('navigation', { name: 'On this page' })).not.toBeInTheDocument();
  });
});
