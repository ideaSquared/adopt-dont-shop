import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the human-readable application status label', () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('humanises statuses it does not know', () => {
    render(<StatusBadge status="escalated_to_admin" />);
    expect(screen.getByText('Escalated To Admin')).toBeInTheDocument();
  });
});
