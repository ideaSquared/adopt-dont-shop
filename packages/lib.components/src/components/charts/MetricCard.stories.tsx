import type { Meta, StoryObj } from '@storybook/react';
import { MetricCard } from './MetricCard';

const meta: Meta<typeof MetricCard> = {
  title: 'Charts/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
  argTypes: {
    format: {
      control: { type: 'select' },
      options: ['number', 'percent', 'currency', 'duration'],
    },
    deltaInverted: { control: { type: 'boolean' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { label: 'Total users', value: 12543 },
};

export const WithDelta: Story = {
  args: { label: 'Adoption rate', value: 0.163, format: 'percent', delta: 0.052 },
};

export const InvertedDelta: Story = {
  args: { label: 'Error rate', value: 0.021, format: 'percent', delta: 0.004, deltaInverted: true },
};

export const Currency: Story = {
  args: { label: 'Donations', value: 48200, format: 'currency' },
};

export const WithHelperText: Story = {
  args: { label: 'Active rescues', value: 74, helperText: '90 total' },
};

export const WithIcon: Story = {
  args: { label: 'Total users', value: 12543, icon: '👥', iconColor: '#667eea' },
};
