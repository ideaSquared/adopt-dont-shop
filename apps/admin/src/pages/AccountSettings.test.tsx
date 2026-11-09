import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

vi.mock('@adopt-dont-shop/lib.account', () => ({
  AccountSettings: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <div>
      <p>Showing {value}</p>
      <button onClick={() => onChange('security')}>Go to security</button>
    </div>
  ),
}));

import AccountSettings from './AccountSettings';

describe('Admin AccountSettings page', () => {
  it('shows the shared account settings, opening on notifications', () => {
    renderWithProviders(<AccountSettings />, { initialRoute: '/account' });

    expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument();
    expect(screen.getByText('Showing notifications')).toBeInTheDocument();
  });

  it('remembers the tab the admin picks', () => {
    renderWithProviders(<AccountSettings />, { initialRoute: '/account' });

    fireEvent.click(screen.getByRole('button', { name: 'Go to security' }));

    expect(screen.getByText('Showing security')).toBeInTheDocument();
  });
});
