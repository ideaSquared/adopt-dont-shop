import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const TABS = [
  { id: 'profile', label: 'Profile', content: <p>Profile settings</p> },
  { id: 'security', label: 'Security', content: <p>Security settings</p> },
  { id: 'appearance', label: 'Appearance', content: <p>Appearance settings</p> },
];

const Controlled = () => {
  const [value, setValue] = useState('profile');
  return <Tabs tabs={TABS} value={value} onChange={setValue} aria-label='Settings sections' />;
};

export const Default: Story = {
  render: () => <Controlled />,
};
