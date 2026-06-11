import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./StatusBadge.css', () => ({
  badge: ({ variant }: { variant: string }) => `badge-${variant}`,
}));

import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the human-readable status label', () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('applies the correct variant class for each known status', () => {
    const { rerender, container } = render(<StatusBadge status="approved" />);
    expect(container.firstChild).toHaveClass('badge-success');

    rerender(<StatusBadge status="rejected" />);
    expect(container.firstChild).toHaveClass('badge-danger');

    rerender(<StatusBadge status="withdrawn" />);
    expect(container.firstChild).toHaveClass('badge-secondary');
  });

  it('appends an externally provided className', () => {
    const { container } = render(<StatusBadge status="approved" className="extra" />);
    expect(container.firstChild).toHaveClass('badge-success');
    expect(container.firstChild).toHaveClass('extra');
  });
});
