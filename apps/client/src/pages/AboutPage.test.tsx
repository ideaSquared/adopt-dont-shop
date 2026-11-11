import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import { AboutPage } from './AboutPage';

describe('AboutPage', () => {
  it('renders the About heading and a description of the platform', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('heading', { name: /about adopt don't shop/i })).toBeInTheDocument();
    expect(
      screen.getByText(/connects rescue organizations with potential adopters/i)
    ).toBeInTheDocument();
  });

  it('explains what the platform offers adopters and rescues', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('heading', { name: /for adopters/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /for rescues/i })).toBeInTheDocument();
  });

  it('points visitors at browsing pets and getting in touch', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('link', { name: /browse pets/i })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute('href', '/contact');
  });
});
