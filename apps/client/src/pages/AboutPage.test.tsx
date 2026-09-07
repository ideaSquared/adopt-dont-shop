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
});
