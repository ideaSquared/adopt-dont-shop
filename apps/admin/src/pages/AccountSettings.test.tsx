import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

vi.mock('@adopt-dont-shop/lib.account', () => ({
  AccountSettings: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <div>
      <p>Open section: {value || 'none'}</p>
      <button onClick={() => onChange('password')}>Change password</button>
    </div>
  ),
}));

import AccountSettings from './AccountSettings';

describe('Admin AccountSettings page', () => {
  it('shows the shared account settings with nothing open', () => {
    renderWithProviders(<AccountSettings />, { initialRoute: '/account' });

    expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument();
    expect(screen.getByText('Open section: none')).toBeInTheDocument();
  });

  it('remembers the section the admin opens', () => {
    renderWithProviders(<AccountSettings />, { initialRoute: '/account' });

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(screen.getByText('Open section: password')).toBeInTheDocument();
  });
});
