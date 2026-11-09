import type { Meta, StoryObj } from '@storybook/react';
import { DropdownButton } from './DropdownButton';

const meta: Meta<typeof DropdownButton> = {
  title: 'Components/DropdownButton',
  component: DropdownButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    triggerLabel: 'Actions',
    items: [
      { label: 'Edit', onClick: () => undefined },
      { label: 'View details', to: '/details' },
      { label: 'Delete', onClick: () => undefined, danger: true, separatorBefore: true },
    ],
  },
};

export const Disabled: Story = {
  args: { triggerLabel: 'Actions', items: [], disabled: true },
};
