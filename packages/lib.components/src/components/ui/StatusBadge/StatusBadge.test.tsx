import { render, screen } from '@testing-library/react';
import React from 'react';

import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('shows the shared label for a status', () => {
    render(<StatusBadge kind='pet' status='medical_care' />);

    expect(screen.getByRole('status')).toHaveTextContent('Medical Care');
  });

  it('labels each kind from its own status set', () => {
    render(
      <>
        <StatusBadge kind='application' status='submitted' />
        <StatusBadge kind='rescue' status='pending' />
        <StatusBadge kind='user' status='pending_verification' />
        <StatusBadge kind='supportTicket' status='waiting_for_user' />
        <StatusBadge kind='report' status='under_review' />
      </>
    );

    expect(screen.getAllByRole('status').map(el => el.textContent)).toEqual([
      'Submitted',
      'Pending Verification',
      'Pending Verification',
      'Waiting for User',
      'Under Review',
    ]);
  });

  it('humanises a status it does not know instead of failing', () => {
    render(<StatusBadge kind='pet' status='awaiting_transport' />);

    expect(screen.getByRole('status')).toHaveTextContent('Awaiting Transport');
  });

  it('lets the caller override the label', () => {
    render(<StatusBadge kind='pet' status='available' label='Available for Adoption' />);

    expect(screen.getByRole('status')).toHaveTextContent('Available for Adoption');
  });

  it('renders an explicit variant and label without a kind', () => {
    render(<StatusBadge variant='success' label='Verified email' data-testid='badge' />);

    expect(screen.getByTestId('badge')).toHaveTextContent('Verified email');
  });
});
