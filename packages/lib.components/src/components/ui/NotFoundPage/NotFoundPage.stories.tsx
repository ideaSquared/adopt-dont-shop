import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';

import { NotFoundPage } from './NotFoundPage';

const meta: Meta<typeof NotFoundPage> = {
  title: 'Components/NotFoundPage',
  component: NotFoundPage,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { homeLabel: 'Back to dashboard' },
};

export const WithSuggestions: Story = {
  args: {
    homeLabel: 'Take me home',
    suggestions: [
      { to: '/discover', label: 'Discover pets' },
      { to: '/search', label: 'Search' },
      { to: '/help', label: 'Get help' },
    ],
  },
};
