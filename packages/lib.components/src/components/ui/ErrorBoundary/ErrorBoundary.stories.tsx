import type { Meta, StoryObj } from '@storybook/react';

import { ErrorBoundary } from './ErrorBoundary';

const Crash = (): never => {
  throw new Error('Storybook crash');
};

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultFallback: Story = {
  args: { children: <Crash /> },
};

export const CustomFallback: Story = {
  args: { children: <Crash />, fallback: <p>This section is unavailable.</p> },
};

export const NoError: Story = {
  args: { children: <p>Everything is fine.</p> },
};
