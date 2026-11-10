import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu } from './DropdownMenu';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    triggerLabel: 'Account',
    items: [
      { label: 'Profile', to: '/profile' },
      { label: 'Settings', to: '/settings' },
      { label: 'Log out', onClick: () => undefined, danger: true, separatorBefore: true },
    ],
  },
};

export const WithDescriptionsAndHeader: Story = {
  args: {
    triggerLabel: 'Export',
    header: 'Export as',
    items: [
      { label: 'CSV', description: 'Spreadsheet-compatible', onClick: () => undefined },
      { label: 'PDF', description: 'Formatted report', onClick: () => undefined },
      { label: 'Email report', disabled: true },
    ],
  },
};
