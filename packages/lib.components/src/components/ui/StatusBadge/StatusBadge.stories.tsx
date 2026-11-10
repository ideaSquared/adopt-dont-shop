import type { Meta, StoryObj } from '@storybook/react';
import { PET_STATUSES } from '@adopt-dont-shop/lib.types';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Pet: Story = {
  args: { kind: 'pet', status: 'available' },
};

export const Application: Story = {
  args: { kind: 'application', status: 'approved' },
};

export const LabelOverride: Story = {
  args: { kind: 'pet', status: 'available', label: 'Available for Adoption' },
};

export const ExplicitVariant: Story = {
  render: () => <StatusBadge variant='info' label='Beta' />,
};

export const AllPetStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {PET_STATUSES.map(status => (
        <StatusBadge key={status} kind='pet' status={status} />
      ))}
    </div>
  ),
};
