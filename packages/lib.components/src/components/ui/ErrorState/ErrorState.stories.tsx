import type { Meta, StoryObj } from '@storybook/react';

import { ErrorState } from './ErrorState';

const meta: Meta<typeof ErrorState> = {
  title: 'Components/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Something went wrong',
    message: 'We could not load this content.',
  },
};

export const WithRetry: Story = {
  args: {
    title: 'Failed to load pets',
    message: 'Please check your connection and try again.',
    onRetry: () => {},
  },
};

export const MessageOnly: Story = {
  args: {
    message: 'This report is temporarily unavailable.',
  },
};
