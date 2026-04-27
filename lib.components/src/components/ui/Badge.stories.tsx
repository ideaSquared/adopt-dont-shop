import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'neutral', 'outline', 'count'],
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg'],
    },
    removable: { control: { type: 'boolean' } },
    disabled: { control: { type: 'boolean' } },
    rounded: { control: { type: 'boolean' } },
    dot: { control: { type: 'boolean' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Primary Badge', variant: 'primary', size: 'md' },
};

export const Secondary: Story = {
  args: { children: 'Secondary Badge', variant: 'secondary', size: 'md' },
};

export const Success: Story = {
  args: { children: 'Success Badge', variant: 'success', size: 'md' },
};

export const Error: Story = {
  args: { children: 'Error Badge', variant: 'error', size: 'md' },
};

export const Warning: Story = {
  args: { children: 'Warning Badge', variant: 'warning', size: 'md' },
};

export const Info: Story = {
  args: { children: 'Info Badge', variant: 'info', size: 'md' },
};

export const Neutral: Story = {
  args: { children: 'Neutral Badge', variant: 'neutral', size: 'md' },
};

export const Outline: Story = {
  args: { children: 'Outline Badge', variant: 'outline', size: 'md' },
};

export const CountVariant: Story = {
  args: { children: '5', variant: 'count', size: 'md' },
};

export const ExtraSmall: Story = {
  args: { children: 'XS', variant: 'primary', size: 'xs' },
};

export const Small: Story = {
  args: { children: 'Small', variant: 'primary', size: 'sm' },
};

export const Large: Story = {
  args: { children: 'Large Badge', variant: 'primary', size: 'lg' },
};

export const Rounded: Story = {
  args: { children: 'Rounded Badge', variant: 'primary', size: 'md', rounded: true },
};

export const WithDot: Story = {
  args: { children: 'With Dot', variant: 'primary', size: 'md', dot: true },
};

export const Removable: Story = {
  args: { children: 'Removable Badge', variant: 'primary', size: 'md', removable: true },
};

export const Disabled: Story = {
  args: { children: 'Disabled Badge', variant: 'primary', size: 'md', disabled: true },
};

export const CountWithMax: Story = {
  args: { children: 99, variant: 'count', size: 'md', max: 50 },
};
