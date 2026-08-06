import type { Meta, StoryObj } from '@storybook/react';

import { QueryBoundary } from './QueryBoundary';

const meta: Meta<typeof QueryBoundary> = {
  title: 'Components/QueryBoundary',
  component: QueryBoundary,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const content = <p>Loaded content goes here.</p>;

export const Loading: Story = {
  args: { isLoading: true, children: content },
};

export const ErrorWithRetry: Story = {
  args: {
    isLoading: false,
    isError: true,
    error: new Error('Network request failed'),
    onRetry: () => {},
    children: content,
  },
};

export const Empty: Story = {
  args: { isLoading: false, isEmpty: true, children: content },
};

export const Success: Story = {
  args: { isLoading: false, children: content },
};
