import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: { type: 'select' }, options: ['success', 'error', 'warning', 'info'] },
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
    closable: { control: { type: 'boolean' } },
    showIcon: { control: { type: 'boolean' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { children: 'Action completed!', variant: 'success', size: 'md', showIcon: true },
};

export const Error: Story = {
  args: {
    children: 'An error occurred. Please try again.',
    variant: 'error',
    size: 'md',
    showIcon: true,
  },
};

export const Warning: Story = {
  args: { children: 'Please be careful.', variant: 'warning', size: 'md', showIcon: true },
};

export const Info: Story = {
  args: { children: 'Helpful information.', variant: 'info', size: 'md', showIcon: true },
};

export const WithTitle: Story = {
  args: {
    children: 'This is the detailed message.',
    title: 'Success',
    variant: 'success',
    size: 'md',
    showIcon: true,
  },
};

export const Closable: Story = {
  args: {
    children: 'This alert can be closed.',
    variant: 'info',
    size: 'md',
    closable: true,
    showIcon: true,
  },
};

export const Small: Story = {
  args: { children: 'Small alert', variant: 'success', size: 'sm', showIcon: true },
};

export const Large: Story = {
  args: {
    children: 'Large alert with more visibility.',
    variant: 'info',
    size: 'lg',
    showIcon: true,
  },
};

export const WithoutIcon: Story = {
  args: { children: 'Alert without icon', variant: 'success', size: 'md', showIcon: false },
};

export const WithTitleAndClose: Story = {
  args: {
    children: 'You can close this alert.',
    title: 'Notice',
    variant: 'warning',
    size: 'md',
    closable: true,
    showIcon: true,
  },
};

export const ErrorWithClose: Story = {
  args: {
    children: 'An error occurred.',
    title: 'Error',
    variant: 'error',
    size: 'md',
    closable: true,
    showIcon: true,
  },
};
