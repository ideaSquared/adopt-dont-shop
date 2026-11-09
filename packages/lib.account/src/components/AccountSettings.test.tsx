import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  TwoFactorSettings: () => <div>Two-factor controls</div>,
}));

vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
  ThemeToggle: () => <div>Theme controls</div>,
}));

vi.mock('./NotificationPreferencesForm', () => ({
  NotificationPreferencesForm: () => <div>Notification controls</div>,
}));

import { AccountSettings, type AccountSettingsTab } from './AccountSettings';

const Harness = ({
  initial = 'notifications',
  extraTabs,
}: {
  initial?: string;
  extraTabs?: ReadonlyArray<AccountSettingsTab>;
}) => {
  const [tab, setTab] = useState(initial);
  return <AccountSettings value={tab} onChange={setTab} extraTabs={extraTabs} />;
};

const tabNames = () => screen.getAllByRole('tab').map(tab => tab.textContent);
const selectedTab = () => screen.getByRole('tab', { selected: true });

describe('AccountSettings', () => {
  it('offers the same personal settings in every app', () => {
    render(<Harness />);

    expect(tabNames()).toEqual(['Notifications', 'Security', 'Appearance']);
    expect(screen.getByRole('tablist', { name: /account settings/i })).toBeInTheDocument();
  });

  it('opens on notifications', () => {
    render(<Harness />);

    expect(selectedTab()).toHaveTextContent('Notifications');
    expect(screen.getByText('Notification controls')).toBeInTheDocument();
  });

  it.each([
    ['Security', 'Two-factor controls'],
    ['Appearance', 'Theme controls'],
  ])('shows %s settings when that tab is chosen', (tab, content) => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('tab', { name: tab }));

    expect(selectedTab()).toHaveTextContent(tab);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('falls back to notifications for an unknown tab, so stale links still land somewhere', () => {
    render(<Harness initial='preferences' />);

    expect(selectedTab()).toHaveTextContent('Notifications');
  });

  it('adds app-specific tabs after the shared ones', () => {
    render(
      <Harness
        initial='privacy'
        extraTabs={[{ id: 'privacy', label: 'Privacy', content: <div>Privacy controls</div> }]}
      />
    );

    expect(tabNames()).toEqual(['Notifications', 'Security', 'Appearance', 'Privacy']);
    expect(selectedTab()).toHaveTextContent('Privacy');
    expect(screen.getByText('Privacy controls')).toBeInTheDocument();
  });

  it('reports the chosen tab so the app can keep it in the URL', () => {
    const onChange = vi.fn();
    render(<AccountSettings value='notifications' onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));

    expect(onChange).toHaveBeenCalledWith('security');
  });
});
