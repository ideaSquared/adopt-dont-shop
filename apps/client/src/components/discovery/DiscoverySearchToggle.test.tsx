import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils/render';
import { DiscoverySearchToggle } from './DiscoverySearchToggle';

describe('DiscoverySearchToggle', () => {
  it('links to Search and marks Discover as the current surface on the discover view', () => {
    render(<DiscoverySearchToggle active='discover' />);

    const searchLink = screen.getByRole('link', { name: /search/i });
    expect(searchLink).toHaveAttribute('href', '/search');

    const discover = screen.getByText(/discover/i).closest('[aria-current="page"]');
    expect(discover).not.toBeNull();
    // The active surface is not a link.
    expect(screen.queryByRole('link', { name: /discover/i })).toBeNull();
  });

  it('links to Discover and marks Search as the current surface on the search view', () => {
    render(<DiscoverySearchToggle active='search' />);

    const discoverLink = screen.getByRole('link', { name: /discover/i });
    expect(discoverLink).toHaveAttribute('href', '/discover');

    const search = screen.getByText(/search/i).closest('[aria-current="page"]');
    expect(search).not.toBeNull();
    expect(screen.queryByRole('link', { name: /search/i })).toBeNull();
  });

  it('labels the control as a navigation region', () => {
    render(<DiscoverySearchToggle active='discover' />);
    expect(screen.getByRole('navigation', { name: /browse mode/i })).toBeInTheDocument();
  });
});
