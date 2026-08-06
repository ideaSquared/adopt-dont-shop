import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';

import { NavSidebar, type NavSidebarGroup } from './NavSidebar';

const groups: NavSidebarGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/analytics', label: 'Analytics', icon: '📈' },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { to: '/users', label: 'Users', icon: '👥' },
      { to: '/pets', label: 'Pets', icon: '🐕' },
      { to: '/messages', label: 'Messages', icon: '💬', badge: 5, badgeAriaLabel: '5 unread' },
    ],
  },
];

const meta: Meta<typeof NavSidebar> = {
  title: 'Components/NavSidebar',
  component: NavSidebar,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <MemoryRouter initialEntries={['/users']}>
        <div style={{ height: '520px', display: 'flex' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: { groups },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  args: { collapsible: true, collapsed: true },
};

export const WithFooter: Story = {
  args: { footer: <span>Admin Panel v1.0.0</span> },
};
