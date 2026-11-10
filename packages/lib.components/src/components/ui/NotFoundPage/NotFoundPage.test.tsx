import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { NotFoundPage } from './NotFoundPage';

const renderPage = (props: Parameters<typeof NotFoundPage>[0]) =>
  render(
    <MemoryRouter>
      <NotFoundPage {...props} />
    </MemoryRouter>
  );

describe('NotFoundPage', () => {
  it('announces the 404 with a heading', () => {
    renderPage({ homeLabel: 'Back to dashboard' });

    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
    expect(screen.getByText(/this page ran away/i)).toBeInTheDocument();
  });

  it('links home with the supplied label, to / by default', () => {
    renderPage({ homeLabel: 'Back to dashboard' });

    const link = screen.getByRole('link', { name: /back to dashboard/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('links to a custom home destination', () => {
    renderPage({ homeLabel: 'Take me home', homeTo: '/start' });

    expect(screen.getByRole('link', { name: /take me home/i })).toHaveAttribute('href', '/start');
  });

  it('renders no suggestion links unless given', () => {
    renderPage({ homeLabel: 'Take me home' });

    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders each suggestion as a link', () => {
    renderPage({
      homeLabel: 'Take me home',
      suggestions: [
        { to: '/discover', label: 'Discover pets' },
        { to: '/help', label: 'Get help' },
      ],
    });

    expect(screen.getByRole('link', { name: 'Discover pets' })).toHaveAttribute(
      'href',
      '/discover'
    );
    expect(screen.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', '/help');
  });
});
